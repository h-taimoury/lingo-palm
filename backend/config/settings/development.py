from .base import *  # noqa: F403

DEBUG = True
ROOT_URLCONF = "config.urls_development"

INSTALLED_APPS += ["apps.scraper_admin"]  # noqa: F405

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

JWT_COOKIE_SECURE = False
JWT_COOKIE_SAMESITE = "Lax"

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
