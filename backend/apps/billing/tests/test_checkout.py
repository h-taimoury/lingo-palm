from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import close_old_connections, connections
from django.test import TransactionTestCase, override_settings, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.billing import services, zarinpal
from apps.billing.models import PaymentOrder, StaffGrant


CHECKOUT = "/api/billing/checkout/"
AUTHORITY = "S" + "0" * 35


@override_settings(BILLING_MODE="sandbox", BILLING_SUPPORT_EMAIL="help@example.test")
class CheckoutTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email="buyer@example.test", password=None)
        self.client.force_authenticate(self.user)

    def order(self):
        with patch.object(zarinpal, "request_payment", return_value={"code": 100, "authority": AUTHORITY}):
            return services.begin_checkout(self.user, uuid4())

    def test_checkout_is_private_and_has_one_server_controlled_order_per_attempt(self):
        reference = uuid4()
        with patch.object(zarinpal, "request_payment", return_value={"code": 100, "authority": AUTHORITY}) as start:
            for _ in range(2):
                response = self.client.post(CHECKOUT, {"reference": reference, "amount": 1, "days": 3000}, format="json")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["amount_tomans"], 200_000)
                self.assertEqual(response.data["checkout_url"], f"https://sandbox.zarinpal.com/pg/StartPay/{AUTHORITY}")
            start.assert_called_once()
        order = PaymentOrder.objects.get(reference=reference)
        self.assertEqual((order.amount, order.days), (2_000_000, 30))
        other = get_user_model().objects.create_user(email="other@example.test", password=None)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(f"/api/billing/orders/{reference}/").status_code, 404)
        self.assertEqual(self.client.post(CHECKOUT, {"reference": reference}, format="json").status_code, 409)

    @override_settings(BILLING_MODE="live")
    def test_live_checkout_refuses_a_customer_paid_gateway_fee(self):
        with patch.object(zarinpal, "request_payment", return_value={
            "code": 100, "authority": "A" + "0" * 35, "fee_type": "Payer",
        }):
            response = self.client.post(CHECKOUT, {"reference": uuid4()}, format="json")
        self.assertEqual(response.data["state"], "failed")
        self.assertNotIn("checkout_url", response.data)

    def test_paid_order_recovers_when_the_buyer_never_returns(self):
        order = self.order()
        now = timezone.now()
        self.user.subscription_ends_at = now + timedelta(days=10)
        self.user.save(update_fields=["subscription_ends_at"])
        with patch.object(zarinpal, "inquiry", return_value={"code": 100, "status": "PAID"}), \
             patch.object(zarinpal, "verify", return_value={"code": 100, "ref_id": 42}) as verify:
            call_command("reconcile_payments")
            call_command("reconcile_payments")
            verify.assert_called_once()
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.state, PaymentOrder.State.FULFILLED)
        self.assertEqual(order.receipt, "42")
        self.assertEqual(self.user.subscription_ends_at, now + timedelta(days=40))

    def test_timeout_and_crash_are_recoverable_using_the_same_order(self):
        order = self.order()
        callback = f"/api/billing/return/?Authority={AUTHORITY}&Status=OK"
        with patch.object(zarinpal, "verify", side_effect=zarinpal.GatewayUnavailable):
            self.assertEqual(self.client.get(callback)["Location"], f"/payments/{order.reference}")
        order.refresh_from_db()
        self.assertEqual(order.state, PaymentOrder.State.PENDING)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.subscription_ends_at)
        with patch.object(zarinpal, "verify", return_value={"code": 100}), \
             patch.object(PaymentOrder, "save", side_effect=RuntimeError("interrupted commit")):
            with self.assertRaises(RuntimeError):
                services.recheck(order, returned_ok=True)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.subscription_ends_at)
        with patch.object(zarinpal, "verify", return_value={"code": 101}) as verify:
            self.assertEqual(self.client.get(callback).status_code, 302)
            self.assertEqual(self.client.get(callback).status_code, 302)
            verify.assert_called_once()
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.state, PaymentOrder.State.FULFILLED)
        self.assertEqual(self.user.subscription_ends_at, order.fulfilled_at + timedelta(days=30))

    def test_cancelled_order_and_wrong_amount_never_extend_access(self):
        order = self.order()
        with patch.object(zarinpal, "verify", return_value={"code": -50}):
            services.recheck(order, returned_ok=True)
        order.refresh_from_db()
        self.assertEqual(order.state, PaymentOrder.State.PENDING)
        with patch.object(zarinpal, "inquiry", return_value={"code": 100, "status": "FAILED"}), \
             patch.object(zarinpal, "verify") as verify:
            self.client.get(f"/api/billing/return/?Authority={AUTHORITY}&Status=NOK")
            verify.assert_not_called()
        order.refresh_from_db()
        self.assertEqual(order.state, PaymentOrder.State.FAILED)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.subscription_ends_at)

    def test_nok_return_leaves_unconfirmed_order_recoverable(self):
        order = self.order()
        with patch.object(zarinpal, "inquiry", return_value={"code": 100, "status": "IN_BANK"}), \
             patch.object(zarinpal, "verify") as verify:
            response = self.client.get(f"/api/billing/return/?Authority={AUTHORITY}&Status=NOK")
            self.assertEqual(response["Location"], f"/payments/{order.reference}?checkout=incomplete")
            verify.assert_not_called()
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.state, PaymentOrder.State.PENDING)
        self.assertIsNone(self.user.subscription_ends_at)
        with patch.object(zarinpal, "inquiry", return_value={"code": 100, "status": "PAID"}), \
             patch.object(zarinpal, "verify", return_value={"code": 100, "ref_id": 42}):
            services.recheck(order)
        order.refresh_from_db()
        self.assertEqual(order.state, PaymentOrder.State.FULFILLED)

    def test_staff_grants_only_allowed_durations_and_preserve_expiry(self):
        staff = get_user_model().objects.create_user(email="staff@example.test", password=None, is_staff=True)
        with self.assertRaises(ValueError):
            services.grant_access(user_id=self.user.pk, staff=self.user, days=7)
        with self.assertRaises(ValueError):
            services.grant_access(user_id=self.user.pk, staff=staff, days=2)
        first = services.grant_access(user_id=self.user.pk, staff=staff, days=7)
        second = services.grant_access(user_id=self.user.pk, staff=staff, days=30)
        self.assertEqual(second.resulting_expiry, first.resulting_expiry + timedelta(days=30))
        self.assertEqual(StaffGrant.objects.count(), 2)

    def test_account_deletion_preserves_pending_payment(self):
        order = self.order()
        self.assertEqual(self.client.delete("/api/users/me/").status_code, 409)
        self.assertTrue(PaymentOrder.objects.filter(pk=order.pk).exists())


class ConcurrentExtensionTests(TransactionTestCase):
    @skipUnlessDBFeature("has_select_for_update")
    def test_concurrent_orders_and_staff_grant_each_extend_once(self):
        users = get_user_model().objects
        buyer = users.create_user(email="buyer@example.test", password=None)
        staff = users.create_user(email="staff@example.test", password=None, is_staff=True)
        buyer.subscription_ends_at = timezone.now() + timedelta(days=1)
        buyer.save(update_fields=["subscription_ends_at"])
        first, second = (PaymentOrder.objects.create(reference=uuid4(), buyer=buyer, sandbox=True,
                                                   amount=2_000_000, days=30) for _ in range(2))
        actions = [lambda: services.fulfill(first, {}), lambda: services.fulfill(first, {}),
                   lambda: services.fulfill(second, {}),
                   lambda: services.grant_access(user_id=buyer.pk, staff=staff, days=7)]
        barrier = Barrier(len(actions), timeout=10)

        def run(action):
            close_old_connections()
            try:
                barrier.wait()
                action()
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(actions)) as pool:
            list(pool.map(run, actions))
        self.assertEqual(PaymentOrder.objects.filter(state="fulfilled").count(), 2)
        self.assertEqual(StaffGrant.objects.count(), 1)
        expected = buyer.subscription_ends_at + timedelta(days=67)
        buyer.refresh_from_db()
        self.assertEqual(buyer.subscription_ends_at, expected)
