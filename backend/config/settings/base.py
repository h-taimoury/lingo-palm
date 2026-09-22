from datetime import timedelta
from pathlib import Path

import environ

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

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "users.User"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = "/static/"
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "/media/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
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
