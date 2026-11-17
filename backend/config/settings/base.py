from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parents[2]

env = environ.Env()

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env.str(
    "DJANGO_SECRET_KEY",
    default="unsafe-development-key-change-me",
)
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])  # type: ignore

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "rest_framework",
    "django_filters",
    "rest_framework_simplejwt.token_blacklist",
]

LOCAL_APPS = [
    "apps.users",
    "apps.dictionary",
    "apps.courses",
    "apps.my_vocabulary",
    "apps.billing",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",  # type: ignore
    )
}

if DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql":
    # Compatible with Neon/PgBouncer transaction pooling as well as direct URLs.
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True
    DATABASES["default"].setdefault("OPTIONS", {}).setdefault("connect_timeout", 15)

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "users.User"
AUTHENTICATION_BACKENDS = ["apps.users.backends.VerifiedEmailBackend"]

FRONTEND_ORIGIN = env.str("FRONTEND_ORIGIN", default="http://localhost:3000").rstrip("/")
PASSWORD_RESET_TIMEOUT = 30 * 60
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env.str("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env.str("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env.str("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", default="LingoPalm <noreply@lingopalm.com>")

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = "/static/"
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "/media/"

COURSE_SUBSCRIPTIONS_ENABLED = env.bool("COURSE_SUBSCRIPTIONS_ENABLED", default=False)
CLIP_REVIEW_ENABLED = env.bool("CLIP_REVIEW_ENABLED", default=False)
BILLING_MODE = env.str("BILLING_MODE", default="disabled")
ZARINPAL_MERCHANT_ID = env.str("ZARINPAL_MERCHANT_ID", default="")
BILLING_CALLBACK_ORIGIN = env.str("BILLING_CALLBACK_ORIGIN", default="").rstrip("/")
BILLING_SUPPORT_EMAIL = env.str("BILLING_SUPPORT_EMAIL", default="")
BILLING_TEST_BUYER_EMAIL = env.str("BILLING_TEST_BUYER_EMAIL", default="")
PRIVATE_VIDEO_ORIGIN = env.str("PRIVATE_VIDEO_ORIGIN", default="")
PRIVATE_VIDEO_TOKEN = env.str("PRIVATE_VIDEO_TOKEN", default="")

if BILLING_MODE not in ("disabled", "sandbox", "private-live", "live"):
    raise ImproperlyConfigured("Unknown BILLING_MODE.")
if BILLING_MODE != "disabled":
    try:
        UUID(ZARINPAL_MERCHANT_ID)
    except ValueError as exc:
        raise ImproperlyConfigured("ZARINPAL_MERCHANT_ID must be a UUID.") from exc
    callback = urlsplit(BILLING_CALLBACK_ORIGIN)
    allowed_schemes = ("https", "http") if BILLING_MODE == "sandbox" else ("https",)
    if (callback.scheme not in allowed_schemes or not callback.hostname or callback.username is not None
            or callback.path or callback.query or callback.fragment):
        raise ImproperlyConfigured("BILLING_CALLBACK_ORIGIN must be an origin.")
    if BILLING_MODE in ("private-live", "live") and not BILLING_SUPPORT_EMAIL:
        raise ImproperlyConfigured("Live billing requires BILLING_SUPPORT_EMAIL.")
    if BILLING_MODE == "private-live" and not BILLING_TEST_BUYER_EMAIL:
        raise ImproperlyConfigured("Private live billing requires BILLING_TEST_BUYER_EMAIL.")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "NUM_PROXIES": env.int("AUTH_NUM_PROXIES", default=0),
    # This was for before storing tokens in http-only cookies:
    # "DEFAULT_AUTHENTICATION_CLASSES": (
    #     "rest_framework_simplejwt.authentication.JWTAuthentication",
    # ),
    # This is for after:
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.users.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "CHECK_REVOKE_TOKEN": True,
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(weeks=2),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
}
# These two come from django-cors-headers 👇:
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])  # type: ignore # If CORS_ALLOWED_ORIGINS= ['http://localhost:3000'], this header will be added to the server's response: Access-Control-Allow-Origin: http://localhost:3000
CORS_ALLOW_CREDENTIALS = (
    True  # The server responds with this header: Access-Control-Allow-Credentials: true
)

# This is a Django setting for Django's built-in CSRF protection 👇:
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])  # type: ignore

# For a httpOnly-cookie-based JWT flow (login/refresh/logout)👇:
JWT_ACCESS_COOKIE_NAME = env(
    "JWT_ACCESS_COOKIE_NAME",
    default="access_token",
)  # type: ignore

JWT_REFRESH_COOKIE_NAME = env(
    "JWT_REFRESH_COOKIE_NAME",
    default="refresh_token",
)  # type: ignore

JWT_COOKIE_DOMAIN = env.str("JWT_COOKIE_DOMAIN", default="") or None
CSRF_COOKIE_DOMAIN = env.str("CSRF_COOKIE_DOMAIN", default="") or None

# JWT_COOKIE_PATH = env(
#     "JWT_COOKIE_PATH",
#     default="/",
# )  # type: ignore

JWT_COOKIE_SECURE = env.bool(
    "JWT_COOKIE_SECURE",
    default=False,
)

JWT_COOKIE_SAMESITE = env(
    "JWT_COOKIE_SAMESITE",
    default="Lax",
)  # type: ignore

# For a httpOnly-cookie-based JWT flow (login/refresh/logout)👆

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": env("LOG_LEVEL", default="INFO"),  # type: ignore
    },
}
