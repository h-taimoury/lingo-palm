from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    RefreshTokenView,
    UserDetailView,
    UserListView,
    UserProfileView,
    UserRegistrationView,
)

urlpatterns = [
    path("register/", UserRegistrationView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", UserProfileView.as_view(), name="me"),
    path("", UserListView.as_view(), name="users"),
    path("<int:pk>/", UserDetailView.as_view(), name="user-detail"),
]
