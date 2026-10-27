from django.test import TestCase, override_settings
from rest_framework.test import APIClient


@override_settings(
    ALLOWED_HOSTS=["lingo-palm-api.onrender.com"],
    CSRF_TRUSTED_ORIGINS=["https://lingo-palm-frontend.vercel.app"],
    JWT_COOKIE_DOMAIN=None,
    CSRF_COOKIE_DOMAIN=None,
    JWT_COOKIE_SECURE=True,
    CSRF_COOKIE_SECURE=True,
    JWT_COOKIE_SAMESITE="Lax",
)
class ProxyAuthTests(TestCase):
    def test_host_only_cookies_and_csrf_for_vercel_proxy(self):
        client = APIClient(enforce_csrf_checks=True)
        headers = {
            "HTTP_HOST": "lingo-palm-api.onrender.com",
            "HTTP_ORIGIN": "https://lingo-palm-frontend.vercel.app",
            "secure": True,
        }
        response = client.post(
            "/api/users/register/",
            {"email": "demo@example.com", "password": "Example-strong-924!"},
            format="json", **headers,
        )
        self.assertEqual(response.status_code, 201)
        for name in ("access_token", "refresh_token", "csrftoken"):
            self.assertEqual(response.cookies[name]["domain"], "")
            self.assertTrue(response.cookies[name]["secure"])
        self.assertTrue(response.cookies["access_token"]["httponly"])
        self.assertFalse(response.cookies["csrftoken"]["httponly"])
        csrf = response.cookies["csrftoken"].value
        self.assertEqual(client.get("/api/users/me/", **headers).status_code, 200)
        self.assertEqual(client.post("/api/users/refresh/", {}, format="json", **headers).status_code, 403)
        good = {**headers, "HTTP_X_CSRFTOKEN": csrf}
        self.assertEqual(client.post("/api/users/refresh/", {}, format="json", **good).status_code, 200)
        bad = {**good, "HTTP_ORIGIN": "https://untrusted.example"}
        self.assertEqual(client.post("/api/users/refresh/", {}, format="json", **bad).status_code, 403)
        logout = client.post("/api/users/logout/", {}, format="json", **good)
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(logout.cookies["access_token"]["max-age"], 0)
        self.assertEqual(logout.cookies["access_token"]["domain"], "")
