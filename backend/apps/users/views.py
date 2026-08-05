from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import enforce_csrf
from .models import User
from .serializers import UserSerializer, UserSerializerForAdmins


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
        path=settings.JWT_COOKIE_PATH,
    )

    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        secure=settings.JWT_COOKIE_SECURE,
        httponly=True,
        samesite=settings.JWT_COOKIE_SAMESITE,
        domain=settings.JWT_COOKIE_DOMAIN,
        path=settings.JWT_COOKIE_PATH,
    )


def _clear_auth_cookies(response):
    """
    Remove the JWT authentication cookies from the browser.
    """
    response.delete_cookie(
        key=settings.JWT_ACCESS_COOKIE_NAME,
        domain=settings.JWT_COOKIE_DOMAIN,
        path=settings.JWT_COOKIE_PATH,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )

    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        domain=settings.JWT_COOKIE_DOMAIN,
        path=settings.JWT_COOKIE_PATH,
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
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def perform_create(self, serializer):
        self.user = serializer.save()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        refresh = RefreshToken.for_user(self.user)

        _set_auth_cookies(
            response,
            access_token=str(refresh.access_token),
            refresh_token=str(refresh),
        )

        _set_csrf_cookie(request)

        return response


class LoginView(APIView):
    """
    Authenticate a user and store the JWT pair in HttpOnly cookies.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
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

    def post(self, request):
        enforce_csrf(request)

        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)

        if not refresh_token:
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data["access"]
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
            access_token=access_token,
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


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Handles GET, PUT, PATCH, DELETE requests for a specific user by PK.
    Restricted to admin users.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializerForAdmins
    permission_classes = [permissions.IsAdminUser]


class UserProfileView(generics.RetrieveUpdateDestroyAPIView):
    """
    Handles GET, PUT, PATCH, DELETE requests for the currently logged-in user.
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
