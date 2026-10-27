from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])  # noqa: F405
render_hostname = env.str("RENDER_EXTERNAL_HOSTNAME", default="")  # noqa: F405
if render_hostname and render_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_hostname)

# Never silently create a temporary SQLite database on the production host.
if not env.str("DATABASE_URL", default=""):  # noqa: F405
    raise ImproperlyConfigured("DATABASE_URL must be set in production.")
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":  # noqa: F405
    raise ImproperlyConfigured("Production requires a PostgreSQL DATABASE_URL.")

if SECRET_KEY == "unsafe-development-key-change-me":  # noqa: F405
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")

if not ALLOWED_HOSTS:  # noqa: F405
    raise ImproperlyConfigured("ALLOWED_HOSTS must be set in production.")

JWT_COOKIE_SECURE = True
JWT_COOKIE_SAMESITE = "Lax"

# Host-only cookies work through a same-origin Vercel API proxy. A shared
# custom domain remains optional when both services use sibling subdomains.
JWT_COOKIE_DOMAIN = env.str("JWT_COOKIE_DOMAIN", default="") or None  # noqa: F405
CSRF_COOKIE_DOMAIN = env.str("CSRF_COOKIE_DOMAIN", default="") or None  # noqa: F405

MIDDLEWARE = [*MIDDLEWARE]  # noqa: F405
MIDDLEWARE.insert(1, "config.static_files.BundledFilesMiddleware")
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
WHITENOISE_MIMETYPES = {".vtt": "text/vtt"}
WHITENOISE_AUTOREFRESH = False
WHITENOISE_USE_FINDERS = False

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
# A liveness check should not depend on a sleeping Neon database or redirects.
SECURE_REDIRECT_EXEMPT = [r"^healthz/$"]
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=3600)  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(  # noqa: F405
    "SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True
)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)  # noqa: F405
# We do not own onrender.com/vercel.app and do not submit them for HSTS preload.
# Keep every other deployment warning fatal in the build check.
SILENCED_SYSTEM_CHECKS = ["security.W021"] if not SECURE_HSTS_PRELOAD else []
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
