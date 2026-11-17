from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    RefreshTokenView,
    UserDetailView,
    UserListView,
    UserProfileView,
    UserRegistrationView,
    CorrectRegistrationEmailView,
    ForgotPasswordView,
    ResendVerificationView,
    ResetPasswordView,
    VerifyEmailView,
)

urlpatterns = [
    path("register/", UserRegistrationView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),
    path("correct-email/", CorrectRegistrationEmailView.as_view(), name="correct-email"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", UserProfileView.as_view(), name="me"),
    path("", UserListView.as_view(), name="users"),
    path("<int:pk>/", UserDetailView.as_view(), name="user-detail"),
]
