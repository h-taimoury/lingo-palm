import uuid

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.middleware.csrf import get_token
from django.utils.crypto import constant_time_compare
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import (
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import CookieJWTAuthentication, enforce_csrf
from .emails import (
    EmailUnavailable, VERIFICATION_SALT, deliver_email,
    send_password_reset_email, send_verification_email,
)
from .models import User
from .serializers import (
    CorrectEmailSerializer, EmailRequestSerializer, LoginSerializer,
    PasswordResetSerializer, ProfileSerializer, RegistrationSerializer,
    UserSerializerForAdmins, VerificationSerializer, check_password_strength,
)
from .throttles import AuthThrottle


def _set_auth_cookies(response, access_token, refresh_token):
    """
    Store the JWT access and refresh tokens in HttpOnly cookies.
    """
    response.set_cookie(
        key=settings.JWT_ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        secure=settings.JWT_COOKIE_SECURE,
        httponly=True,
        samesite=settings.JWT_COOKIE_SAMESITE,
        domain=settings.JWT_COOKIE_DOMAIN,
        # path=settings.JWT_COOKIE_PATH,
    )

    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        secure=settings.JWT_COOKIE_SECURE,
        httponly=True,
        samesite=settings.JWT_COOKIE_SAMESITE,
        domain=settings.JWT_COOKIE_DOMAIN,
        # path=settings.JWT_COOKIE_PATH,
    )


def _clear_auth_cookies(response):
    """
    Remove the JWT authentication cookies from the browser.
    """
    response.delete_cookie(
        key=settings.JWT_ACCESS_COOKIE_NAME,
        domain=settings.JWT_COOKIE_DOMAIN,
        # path=settings.JWT_COOKIE_PATH,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )

    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        domain=settings.JWT_COOKIE_DOMAIN,
        # path=settings.JWT_COOKIE_PATH,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )


def _set_csrf_cookie(request):
    """
    Mark Django's CSRF cookie as needed for the response.

    The CSRF cookie is intentionally NOT HttpOnly because the frontend
    needs to read it and send its value in the X-CSRFToken header.
    """
    get_token(request)


class UserRegistrationView(generics.CreateAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthThrottle]
    email_cooldown = True

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = serializer.save()
                send_verification_email(user)
        except IntegrityError:
            raise ValidationError({"email": "An account with this email already exists."}) from None
        return Response({"detail": "Check your email to verify your account."}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Authenticate a user and store the JWT pair in HttpOnly cookies.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthThrottle]

    def get_authenticate_header(self, request):
        # Login skips existing cookies, but DRF still needs a challenge header
        # to preserve AuthenticationFailed as 401 instead of converting to 403.
        return CookieJWTAuthentication().authenticate_header(request)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data["access"]
        refresh_token = serializer.validated_data["refresh"]

        response = Response(
            {"detail": "Login successful."},
            status=status.HTTP_200_OK,
        )

        _set_auth_cookies(
            response,
            access_token=access_token,
            refresh_token=refresh_token,
        )

        _set_csrf_cookie(request)

        return response


class RefreshTokenView(APIView):
    """
    Rotate the refresh token and issue new JWT cookies.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get_authenticate_header(self, request):
        return CookieJWTAuthentication().authenticate_header(request)

    def post(self, request):
        enforce_csrf(request)

        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)

        if not refresh_token:
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            CookieJWTAuthentication().get_user(RefreshToken(refresh_token))
        except TokenError:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        serializer.is_valid(raise_exception=True)

        new_access_token = serializer.validated_data["access"]
        new_refresh_token = serializer.validated_data.get(
            "refresh",
            refresh_token,
        )

        response = Response(
            {"detail": "Token refreshed successfully."},
            status=status.HTTP_200_OK,
        )

        _set_auth_cookies(
            response,
            access_token=new_access_token,
            refresh_token=new_refresh_token,
        )

        return response


class LogoutView(APIView):
    """
    Log the user out by blacklisting the refresh token and
    removing the authentication cookies.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        enforce_csrf(request)

        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)

        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                # The token may already be expired, invalid, or blacklisted.
                # We still want to remove the browser cookies.
                pass

        response = Response(
            {"detail": "Logout successful."},
            status=status.HTTP_200_OK,
        )

        _clear_auth_cookies(response)

        return response


class UserListView(generics.ListAPIView):
    """
    Handles GET request to list all users.
    Restricted to admin users (is_staff=True).
    """

    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializerForAdmins
    permission_classes = [permissions.IsAdminUser]


class UserHasBillingRecords(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This account has billing records. Contact support for help deleting it."


class BillingAwareUserView(generics.RetrieveUpdateDestroyAPIView):
    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except ProtectedError as exc:
            raise UserHasBillingRecords from exc


class UserDetailView(BillingAwareUserView):
    """
    Handles GET, PUT, PATCH, DELETE requests for a specific user by PK.
    Restricted to admin users.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializerForAdmins
    permission_classes = [permissions.IsAdminUser]


class UserProfileView(BillingAwareUserView):
    """
    Handles GET, PUT, PATCH, DELETE requests for the currently logged-in user.
    """

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthThrottle]
    email_cooldown = True

    def get_object(self):
        if self.request.method in ("PUT", "PATCH"):
            return User.objects.select_for_update().get(pk=self.request.user.pk)
        return self.request.user

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if "password" in request.data:
            _clear_auth_cookies(response)
        return response


class PublicEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthThrottle]


class ResendVerificationView(PublicEmailView):
    email_cooldown = True

    def post(self, request):
        serializer = EmailRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user and (not user.email_verified or user.pending_email):
            try:
                send_verification_email(user)
            except EmailUnavailable:
                # Public recovery responses must not reveal which addresses exist.
                pass
        return Response({"detail": "If verification is needed, we've sent a verification email."})


class CorrectRegistrationEmailView(PublicEmailView):
    email_cooldown = True

    @transaction.atomic
    def post(self, request):
        serializer = CorrectEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.select_for_update().filter(email__iexact=data["email"], is_active=True, email_verified=False).first()
        if not user or not user.check_password(data["password"]):
            raise ValidationError({"detail": "Check your email and password. Only unverified accounts can use this form."})
        email = data["new_email"].lower()
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            raise ValidationError({"new_email": "An account with this email already exists."})
        user.email = email
        user.pending_email = ""
        user.verification_id = uuid.uuid4()
        try:
            with transaction.atomic():
                user.save(update_fields=("email", "pending_email", "verification_id"))
        except IntegrityError:
            raise ValidationError({"new_email": "An account with this email already exists."}) from None
        send_verification_email(user)
        return Response({"detail": "Check your corrected email address for the verification link."})


class VerifyEmailView(PublicEmailView):
    @transaction.atomic
    def post(self, request):
        serializer = VerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invalid = "This verification link is invalid or expired. Request a new link."
        try:
            data = signing.loads(serializer.validated_data["token"], salt=VERIFICATION_SALT, max_age=24 * 60 * 60)
            user = User.objects.select_for_update().get(pk=data["uid"], is_active=True)
        except (signing.BadSignature, User.DoesNotExist, ValueError, TypeError, KeyError):
            raise ValidationError({"detail": invalid}) from None
        if (not constant_time_compare(data.get("nonce", ""), str(user.verification_id))
                or not constant_time_compare(data.get("session", ""), user.get_session_auth_hash())
                or data.get("email") != (user.pending_email or user.email)
                or (user.email_verified and not user.pending_email)):
            raise ValidationError({"detail": invalid})
        if user.pending_email:
            if User.objects.filter(email__iexact=user.pending_email).exclude(pk=user.pk).exists():
                raise ValidationError({"detail": "This email is already in use. Choose another address in account settings."})
            user.email = user.pending_email
        user.pending_email = ""
        user.email_verified = True
        user.verification_id = uuid.uuid4()
        try:
            with transaction.atomic():
                user.save(update_fields=("email", "pending_email", "email_verified", "verification_id"))
        except IntegrityError:
            raise ValidationError({"detail": "This email is already in use. Choose another address in account settings."}) from None
        return Response({"detail": "Your email is verified. You can now sign in."})


class ForgotPasswordView(PublicEmailView):
    email_cooldown = True

    def post(self, request):
        serializer = EmailRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], email_verified=True, is_active=True).first()
        if user and user.has_usable_password():
            try:
                send_password_reset_email(user)
            except EmailUnavailable:
                pass
        return Response({"detail": "If an eligible account exists, we've sent password reset instructions."})


class ResetPasswordView(PublicEmailView):
    @transaction.atomic
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            uid = urlsafe_base64_decode(data["uid"]).decode()
            user = User.objects.select_for_update().get(pk=uid, is_active=True, email_verified=True)
        except (ValueError, UnicodeDecodeError, User.DoesNotExist, OverflowError):
            raise ValidationError({"detail": "This reset link is invalid or expired. Request a new link."}) from None
        if not default_token_generator.check_token(user, data["token"]):
            raise ValidationError({"detail": "This reset link is invalid or expired. Request a new link."})
        check_password_strength(data["password"], user)
        user.set_password(data["password"])
        user.pending_email = ""
        user.verification_id = uuid.uuid4()
        user.save(update_fields=("password", "pending_email", "verification_id"))
        try:
            deliver_email("Your LingoPalm password was changed", "Your password was reset. If this wasn't you, reset your password immediately or contact support.", user.email)
        except EmailUnavailable:
            # A notification failure must not undo a completed password reset.
            pass
        response = Response({"detail": "Your password has been reset. Sign in with your new password."})
        _clear_auth_cookies(response)
        return response
