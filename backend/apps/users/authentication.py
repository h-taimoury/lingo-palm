from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


def enforce_csrf(request):
    """
    Enforce Django's CSRF protection for unsafe requests.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    check = CSRFCheck(lambda request: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})

    if reason:
        raise PermissionDenied(f"CSRF Failed: {reason}")


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticate using the access JWT stored in an HttpOnly cookie.

    SimpleJWT still performs the actual JWT validation. This class only
    changes where the raw token is obtained from.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)

        if raw_token is None:
            return None

        enforce_csrf(request)

        validated_token = self.get_validated_token(raw_token.encode("utf-8"))

        return self.get_user(validated_token), validated_token
