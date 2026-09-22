from django.test import TestCase, override_settings
from rest_framework.test import APIClient


@override_settings(
    ALLOWED_HOSTS=["api.lingopalm.com"],
    CORS_ALLOWED_ORIGINS=["https://lingopalm.com"],
    CSRF_TRUSTED_ORIGINS=["https://lingopalm.com"],
    JWT_COOKIE_DOMAIN=".lingopalm.com",
    CSRF_COOKIE_DOMAIN=".lingopalm.com",
    JWT_COOKIE_SECURE=True,
    CSRF_COOKIE_SECURE=True,
)
class DirectBrowserAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.headers = {
            "HTTP_HOST": "api.lingopalm.com",
            "HTTP_ORIGIN": "https://lingopalm.com",
            "secure": True,
        }

    def test_preflight_allows_credentials_and_csrf_header(self):
        response = self.client.options(
            "/api/users/register/",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-csrftoken",
            **self.headers,
        )
        self.assertEqual(response["Access-Control-Allow-Origin"], "https://lingopalm.com")
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")
        self.assertIn("x-csrftoken", response["Access-Control-Allow-Headers"])

    def test_register_refresh_logout_share_cookie_domain_and_enforce_csrf(self):
        response = self.client.post(
            "/api/users/register/",
            {"email": "direct@example.com", "password": "Example-strong-924!"},
            format="json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response["Access-Control-Allow-Origin"], "https://lingopalm.com")
        for name in ("access_token", "refresh_token", "csrftoken"):
            self.assertEqual(response.cookies[name]["domain"], ".lingopalm.com")
            self.assertTrue(response.cookies[name]["secure"])
        self.assertTrue(response.cookies["access_token"]["httponly"])
        self.assertFalse(response.cookies["csrftoken"]["httponly"])
        csrf = response.cookies["csrftoken"].value
        self.assertEqual(self.client.get("/api/users/me/", **self.headers).status_code, 200)

        denied = self.client.post("/api/users/refresh/", {}, format="json", **self.headers)
        self.assertEqual(denied.status_code, 403)
        refreshed = self.client.post(
            "/api/users/refresh/", {}, format="json", HTTP_X_CSRFTOKEN=csrf, **self.headers,
        )
        self.assertEqual(refreshed.status_code, 200)
        self.assertEqual(refreshed.cookies["access_token"]["domain"], ".lingopalm.com")
        logout = self.client.post(
            "/api/users/logout/", {}, format="json", HTTP_X_CSRFTOKEN=csrf, **self.headers,
        )
        self.assertEqual(logout.status_code, 200)
        for name in ("access_token", "refresh_token"):
            self.assertEqual(logout.cookies[name]["domain"], ".lingopalm.com")
            self.assertEqual(logout.cookies[name]["max-age"], 0)
