from datetime import datetime, timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import verification_token
from .models import AuthRateLimit, User
from .serializers import UserSerializer

PASSWORD = "Cedar-forest-479!"
NEW_PASSWORD = "River-stone-672!"


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", FRONTEND_ORIGIN="https://lingopalm.com")
class EmailAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("learner@example.com", PASSWORD)

    def post(self, name, data):
        return self.client.post(f"/api/users/{name}/", data, format="json")

    def verify(self, token=None):
        return self.post("verify-email", {"token": token or verification_token(self.user)})

    def mark_verified(self):
        self.user.email_verified = True
        self.user.save(update_fields=("email_verified",))

    def reset_payload(self):
        return {
            "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": default_token_generator.make_token(self.user),
            "password": NEW_PASSWORD,
            "password_confirm": NEW_PASSWORD,
        }

    def test_registration_requires_matching_confirmation_and_valid_password(self):
        payload = {"email": "new@example.com", "password": PASSWORD}
        self.assertEqual(self.post("register", payload).status_code, 400)
        self.assertEqual(User.objects.count(), 1)
        AuthRateLimit.objects.all().delete()
        self.assertEqual(self.post("register", {**payload, "password_confirm": "different"}).status_code, 400)
        AuthRateLimit.objects.all().delete()
        self.assertEqual(self.post("register", {**payload, "password": "123", "password_confirm": "123"}).status_code, 400)

    def test_registration_sends_frontend_link_without_auth_cookies(self):
        response = self.post("register", {"email": "NEW@example.com", "password": PASSWORD, "password_confirm": PASSWORD, "email_verified": True})
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="new@example.com")
        self.assertFalse(user.email_verified)
        self.assertNotIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)
        self.assertEqual(mail.outbox[0].to, [user.email])
        link = next(line for line in mail.outbox[0].body.splitlines() if line.startswith("https://"))
        self.assertEqual(urlsplit(link).netloc, "lingopalm.com")
        token = parse_qs(urlsplit(link).query)["token"][0]
        self.assertEqual(self.post("verify-email", {"token": token}).status_code, 200)

    def test_unverified_users_cannot_login_refresh_or_use_old_access_cookies(self):
        response = self.post("login", {"email": self.user.email, "password": PASSWORD})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "email_not_verified")
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies[settings.JWT_ACCESS_COOKIE_NAME] = str(refresh.access_token)
        self.client.cookies[settings.JWT_REFRESH_COOKIE_NAME] = str(refresh)
        self.assertEqual(self.client.get("/api/users/me/").status_code, 401)
        self.assertEqual(self.post("refresh", {}).status_code, 401)

    def test_verification_is_single_use_and_enables_case_insensitive_login(self):
        User.objects.filter(pk=self.user.pk).update(email=self.user.email.upper())
        self.user.refresh_from_db()
        token = verification_token(self.user)
        self.assertEqual(self.verify(token).status_code, 200)
        self.assertEqual(self.verify(token).status_code, 400)
        response = self.post("login", {"email": self.user.email.upper(), "password": PASSWORD})
        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)

    def test_staff_can_sign_in_without_verification_but_demotion_restores_requirement(self):
        self.user.is_staff = True
        self.user.save(update_fields=("is_staff",))
        self.assertTrue(self.client.login(email=self.user.email, password=PASSWORD))
        response = self.post("login", {"email": self.user.email, "password": PASSWORD})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/users/me/").status_code, 200)
        self.assertEqual(self.post("refresh", {}).status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.email_verified)
        self.user.is_staff = False
        self.user.save(update_fields=("is_staff",))
        self.assertEqual(self.client.get("/admin/").status_code, 302)
        self.assertEqual(self.client.get("/api/users/me/").status_code, 401)
        self.assertEqual(self.post("refresh", {}).status_code, 401)

    def test_verification_rejects_expired_tampered_inactive_and_wrong_purpose_tokens(self):
        with patch("django.core.signing.time.time", return_value=1000000000):
            expired = verification_token(self.user)
        self.assertEqual(self.verify(expired).status_code, 400)
        self.assertEqual(self.verify(verification_token(self.user) + "x").status_code, 400)
        self.assertEqual(self.verify(default_token_generator.make_token(self.user)).status_code, 400)
        self.user.is_active = False
        self.user.save(update_fields=("is_active",))
        self.assertEqual(self.verify().status_code, 400)

    def test_resend_uses_generic_responses_and_real_cooldown_for_all_addresses(self):
        known = self.post("resend-verification", {"email": self.user.email})
        unknown = self.post("resend-verification", {"email": "unknown@example.com"})
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)
        for email in (self.user.email, "unknown@example.com"):
            limited = self.post("resend-verification", {"email": email})
            self.assertEqual(limited.status_code, 429)
            self.assertGreaterEqual(int(limited["Retry-After"]), 1)

    def test_correction_requires_password_and_invalidates_original_link(self):
        token = verification_token(self.user)
        payload = {"email": self.user.email, "new_email": "correct@example.com", "password": "wrong"}
        self.assertEqual(self.post("correct-email", payload).status_code, 400)
        AuthRateLimit.objects.all().delete()
        payload["password"] = PASSWORD
        self.assertEqual(self.post("correct-email", payload).status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "correct@example.com")
        self.assertFalse(self.user.email_verified)
        self.assertEqual(self.verify(token).status_code, 400)
        self.assertEqual(self.verify().status_code, 200)

    def test_forgot_password_only_sends_for_verified_active_accounts(self):
        unknown = self.post("forgot-password", {"email": "unknown@example.com"})
        unverified = self.post("forgot-password", {"email": self.user.email})
        self.assertEqual(unknown.data, unverified.data)
        self.assertEqual(len(mail.outbox), 0)
        self.mark_verified()
        AuthRateLimit.objects.all().delete()
        verified = self.post("forgot-password", {"email": self.user.email.upper()})
        self.assertEqual(verified.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("https://lingopalm.com/reset-password?", mail.outbox[0].body)
        self.user.is_active = False
        self.user.save(update_fields=("is_active",))
        AuthRateLimit.objects.all().delete()
        self.assertEqual(self.post("forgot-password", {"email": self.user.email}).data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_reset_is_single_use_and_invalidates_access_and_refresh_on_all_clients(self):
        self.mark_verified()
        login = self.post("login", {"email": self.user.email, "password": PASSWORD})
        other = APIClient()
        other.cookies = login.cookies.copy()
        self.assertEqual(other.get("/api/users/me/").status_code, 200)
        payload = self.reset_payload()
        self.assertEqual(self.post("reset-password", payload).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertEqual(self.post("reset-password", payload).status_code, 400)
        self.assertEqual(other.get("/api/users/me/").status_code, 401)
        self.assertEqual(other.post("/api/users/refresh/", {}, format="json").status_code, 401)
        self.assertIn("password was reset", mail.outbox[-1].body)

    def test_reset_rejects_expired_malformed_unverified_and_weak_passwords(self):
        self.assertEqual(self.post("reset-password", self.reset_payload()).status_code, 400)
        self.mark_verified()
        with patch.object(default_token_generator, "_now", return_value=datetime.now() - timedelta(minutes=31)):
            expired = self.reset_payload()
        self.assertEqual(self.post("reset-password", expired).status_code, 400)
        payload = self.reset_payload()
        for uid in ("!", "bWlzc2luZw", "OQ" * 30):
            self.assertEqual(self.post("reset-password", {**payload, "uid": uid}).status_code, 400)
        self.assertEqual(self.post("reset-password", {**payload, "password": "123", "password_confirm": "123"}).status_code, 400)
        self.assertEqual(self.post("reset-password", {**payload, "password_confirm": "wrong"}).status_code, 400)

    def test_email_change_retains_old_address_until_verified_and_is_single_use(self):
        self.mark_verified()
        self.client.force_authenticate(self.user)
        payload = {"email": "updated@example.com", "current_password": PASSWORD}
        self.assertEqual(self.client.patch("/api/users/me/", payload, format="json").status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "learner@example.com")
        self.assertTrue(self.user.email_verified)
        self.assertEqual(self.user.pending_email, "updated@example.com")
        self.assertEqual(mail.outbox[0].to, ["updated@example.com"])
        token = verification_token(self.user)
        self.assertEqual(self.verify(token).status_code, 200)
        self.assertEqual(self.verify(token).status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "updated@example.com")
        self.assertEqual(self.user.pending_email, "")

    def test_profile_sensitive_changes_require_current_password_and_confirmation(self):
        self.mark_verified()
        self.client.force_authenticate(self.user)
        for payload in ({"email": "updated@example.com"}, {"password": NEW_PASSWORD}, {"password": NEW_PASSWORD, "current_password": PASSWORD}):
            AuthRateLimit.objects.all().delete()
            self.assertEqual(self.client.patch("/api/users/me/", payload, format="json").status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))
        self.assertEqual(self.user.email, "learner@example.com")

    def test_mail_failures_roll_back_registration_and_email_changes(self):
        with patch("apps.users.emails.send_mail", side_effect=OSError("offline")):
            response = self.post("register", {"email": "new@example.com", "password": PASSWORD, "password_confirm": PASSWORD})
            self.assertEqual(response.status_code, 503)
            self.assertFalse(User.objects.filter(email="new@example.com").exists())
            self.mark_verified()
            self.client.force_authenticate(self.user)
            response = self.client.patch("/api/users/me/", {"email": "updated@example.com", "current_password": PASSWORD}, format="json")
            self.assertEqual(response.status_code, 503)
        self.user.refresh_from_db()
        self.assertEqual(self.user.pending_email, "")
        self.assertEqual(self.user.email, "learner@example.com")

    def test_cooldown_expires_without_resetting_hourly_limit(self):
        self.assertEqual(self.post("resend-verification", {"email": self.user.email}).status_code, 200)
        from time import time
        with patch("apps.users.throttles.time", return_value=time() + 61):
            self.assertEqual(self.post("resend-verification", {"email": self.user.email}).status_code, 200)
        self.assertEqual(len(mail.outbox), 2)

    def test_public_recovery_responses_stay_generic_during_email_failure(self):
        self.mark_verified()
        with patch("apps.users.emails.send_mail", side_effect=OSError("offline")):
            known = self.post("forgot-password", {"email": self.user.email})
            unknown = self.post("forgot-password", {"email": "unknown@example.com"})
        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.data, unknown.data)

    def test_notification_failure_does_not_undo_password_reset(self):
        self.mark_verified()
        with patch("apps.users.emails.send_mail", side_effect=OSError("offline")):
            self.assertEqual(self.post("reset-password", self.reset_payload()).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_malformed_json_shapes_return_validation_errors(self):
        for name in ("register", "resend-verification", "forgot-password", "verify-email", "reset-password", "correct-email", "login"):
            self.assertEqual(self.post(name, []).status_code, 400)

    def test_profile_save_preserves_subscription_changes_made_after_user_was_loaded(self):
        from django.utils import timezone

        ends_at = timezone.now() + timedelta(days=30)
        User.objects.filter(pk=self.user.pk).update(subscription_ends_at=ends_at)
        serializer = UserSerializer(self.user, data={"first_name": "Updated"}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.subscription_ends_at, ends_at)
