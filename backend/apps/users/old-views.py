from rest_framework import generics, permissions, status

# from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, UserSerializerForAdmins
from .models import User


class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        self.user = serializer.save()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        token = RefreshToken.for_user(self.user)
        response.data["token"] = str(token.access_token)  # type: ignore

        return response


# --- 2. List All Users ---
class UserListView(generics.ListAPIView):
    """
    Handles GET request to list all users.
    Restricted to admin users (is_staff=True).
    """

    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializerForAdmins
    permission_classes = [permissions.IsAdminUser]


# --- 3. User Detail, Update, Delete (Replaces user_detail FBV) ---
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Handles GET, PUT, PATCH, DELETE requests for a specific user by PK.
    Restricted to admin users.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializerForAdmins
    # The URL pattern provides the 'pk' argument, which is automatically handled by the CBV.
    permission_classes = [permissions.IsAdminUser]


# --- 4. User Profile (Replaces user_profile FBV) ---
class UserProfileView(generics.RetrieveUpdateDestroyAPIView):
    """
    Handles GET, PUT, PATCH, DELETE requests for the currently logged-in user.
    """

    serializer_class = UserSerializer
    # Ensure only logged-in users can access this endpoint
    permission_classes = [permissions.IsAuthenticated]

    # Override get_object to fetch the currently authenticated user
    def get_object(self):
        # The request.user is set by the authentication system (Simple JWT)
        return self.request.user
