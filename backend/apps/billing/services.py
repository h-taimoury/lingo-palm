from datetime import timedelta
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from . import zarinpal
from .models import PaymentOrder, StaffGrant


logger = logging.getLogger(__name__)
PRICE_TOMANS = 200_000
DAYS = 30


def checkout_allowed(user):
    return settings.BILLING_MODE in ("sandbox", "live") or (
        settings.BILLING_MODE == "private-live"
        and user.is_authenticated and user.is_active
        and user.email.casefold() == settings.BILLING_TEST_BUYER_EMAIL.casefold()
    )


def begin_checkout(user, reference):
    order, created = PaymentOrder.objects.get_or_create(reference=reference, defaults={
        "buyer": user, "amount": PRICE_TOMANS * 10, "days": DAYS,
        "sandbox": settings.BILLING_MODE == "sandbox",
    })
    if not created:
        return order
    try:
        result = zarinpal.request_payment(order)
    except zarinpal.GatewayUnavailable:
        result = {}
    authority = result.get("authority")
    merchant_pays = order.sandbox or result.get("fee_type") == "Merchant"
    if result.get("code") == 100 and merchant_pays and zarinpal.valid_authority(authority, order.sandbox):
        order.authority = authority
        order.save(update_fields=["authority"])
    else:
        # No checkout URL was delivered, so the buyer could not have paid this order.
        order.state = PaymentOrder.State.FAILED
        order.save(update_fields=["state"])
        logger.warning("ZarinPal did not open checkout for order %s (code %s)", order.reference, result.get("code"))
    return order


def extend_locked_user(user, days, now):
    user.subscription_ends_at = max(user.subscription_ends_at or now, now) + timedelta(days=days)
    user.save(update_fields=["subscription_ends_at"])
    return user.subscription_ends_at


@transaction.atomic
def fulfill(order, result):
    user = get_user_model().objects.select_for_update().get(pk=order.buyer_id)
    order = PaymentOrder.objects.select_for_update().get(pk=order.pk)
    if order.state != PaymentOrder.State.PENDING:
        return
    now = timezone.now()
    order.resulting_expiry = extend_locked_user(user, order.days, now)
    order.receipt = str(result.get("ref_id") or "")
    order.fulfilled_at = now
    order.state = PaymentOrder.State.FULFILLED
    order.save(update_fields=["resulting_expiry", "receipt", "fulfilled_at", "state"])


def recheck(order, returned_ok=False):
    if order.state != PaymentOrder.State.PENDING or not order.authority:
        return
    pending = PaymentOrder.objects.filter(pk=order.pk, state=PaymentOrder.State.PENDING)
    pending.update(checked_at=timezone.now())
    try:
        if not returned_ok:
            status = zarinpal.inquiry(order)
            if status.get("code") != 100:
                logger.warning("ZarinPal inquiry error for order %s (code %s)", order.reference, status.get("code"))
                return
            if status.get("status") in ("FAILED", "REVERSED"):
                pending.update(state=PaymentOrder.State.FAILED)
                return
            if status.get("status") not in ("PAID", "VERIFIED"):
                return
        verified = zarinpal.verify(order)
    except zarinpal.GatewayUnavailable:
        logger.warning("ZarinPal unavailable while checking order %s", order.reference)
        return
    if verified.get("code") in (100, 101):
        fulfill(order, verified)
    else:
        logger.warning("ZarinPal did not verify order %s (code %s)", order.reference, verified.get("code"))


@transaction.atomic
def grant_access(*, user_id, staff, days):
    if not staff.is_staff or days not in (7, 30):
        raise ValueError("A staff grant must be for 7 or 30 days.")
    learner = get_user_model().objects.select_for_update().get(pk=user_id)
    expiry = extend_locked_user(learner, days, timezone.now())
    return StaffGrant.objects.create(learner=learner, staff=staff, days=days, resulting_expiry=expiry)
