from django.contrib import admin
from django.test import RequestFactory, TestCase, override_settings
from rest_framework.test import APIClient

from .admin import UserAdmin
from .emails import verification_token
from .models import User


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class AdminVerificationTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser("owner@example.com", "Forest-713!")
        self.staff = User.objects.create_user("staff@example.com", "Forest-713!", is_staff=True)
        self.learner = User.objects.create_user("learner@example.com", "Forest-713!", pending_email="pending@example.com")
        self.url = f"/api/users/{self.learner.pk}/"
        self.client = APIClient()
        self.client.force_authenticate(self.superuser)
        self.model_admin = UserAdmin(User, admin.site)

    def test_superuser_can_verify_other_user_and_invalidate_old_links(self):
        old_token = verification_token(self.learner)
        response = self.client.patch(self.url, {"email_verified": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["email_verified"])
        self.learner.refresh_from_db()
        self.assertEqual(self.learner.pending_email, "")
        self.assertEqual(self.client.post("/api/users/verify-email/", {"token": old_token}).status_code, 400)
        login = APIClient().post("/api/users/login/", {"email": self.learner.email, "password": "Forest-713!"})
        self.assertEqual(login.status_code, 200)

    def test_only_superuser_can_verify_others_and_no_one_can_use_it_on_themselves(self):
        for actor, url in ((self.staff, self.url), (self.learner, self.url), (self.superuser, f"/api/users/{self.superuser.pk}/")):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                self.assertEqual(self.client.patch(url, {"email_verified": True}, format="json").status_code, 403)
        self.learner.refresh_from_db()
        self.superuser.refresh_from_db()
        self.assertFalse(self.learner.email_verified)
        self.assertFalse(self.superuser.email_verified)

    def test_verification_cannot_be_undone_or_superuser_status_assigned_via_api(self):
        self.assertEqual(self.client.patch(self.url, {"email_verified": False}, format="json").status_code, 400)
        self.client.patch(self.url, {"is_superuser": True}, format="json")
        self.learner.refresh_from_db()
        self.assertFalse(self.learner.is_superuser)
        self.assertTrue(self.client.get("/api/users/me/").data["is_superuser"])

    def test_current_email_can_be_changed_and_explicitly_verified_in_one_save(self):
        response = self.client.patch(self.url, {"email": "correct@example.com", "email_verified": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.learner.refresh_from_db()
        self.assertEqual(self.learner.email, "correct@example.com")
        self.assertTrue(self.learner.email_verified)

    def test_profile_endpoint_cannot_grant_verification_or_superuser_status(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch("/api/users/me/", {"email_verified": True, "is_superuser": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertFalse(self.staff.email_verified)
        self.assertFalse(self.staff.is_superuser)

    def test_staff_html_put_does_not_silently_verify_a_changed_email(self):
        self.learner.email_verified = True
        self.learner.save(update_fields=("email_verified",))
        self.client.force_authenticate(self.staff)
        response = self.client.put(self.url, {"email": "correct@example.com", "password": "New-forest-729!"})
        self.assertEqual(response.status_code, 200)
        self.learner.refresh_from_db()
        self.assertFalse(self.learner.email_verified)

    def test_django_admin_only_exposes_checkbox_for_superuser_editing_unverified_others(self):
        for actor, target, editable in ((self.superuser, self.learner, True), (self.staff, self.learner, False), (self.superuser, self.superuser, False)):
            with self.subTest(actor=actor.email, target=target.email):
                request = RequestFactory().get("/admin/users/user/")
                request.user = actor
                form = self.model_admin.get_form(request, target)
                self.assertEqual("email_verified" in form.base_fields, editable)

    def test_django_admin_save_verifies_and_clears_pending_email(self):
        request = RequestFactory().post("/admin/users/user/")
        request.user = self.superuser
        form_class = self.model_admin.get_form(request, self.learner)
        form = form_class(data={"email": self.learner.email, "email_verified": "on", "is_active": "on"}, instance=self.learner)
        self.assertTrue(form.is_valid(), form.errors)
        self.model_admin.save_model(request, form.save(commit=False), form, change=True)
        self.learner.refresh_from_db()
        self.assertTrue(self.learner.email_verified)
        self.assertEqual(self.learner.pending_email, "")

    def test_inactive_staff_still_cannot_sign_in(self):
        self.staff.is_active = False
        self.staff.save(update_fields=("is_active",))
        response = APIClient().post("/api/users/login/", {"email": self.staff.email, "password": "Forest-713!"})
        self.assertEqual(response.status_code, 401)
