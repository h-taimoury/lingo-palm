from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffOrAuthenticatedReadOnly(BasePermission):
    """Authenticated users may read; only staff users may write."""

    def has_permission(self, request, view) -> bool:  # noqa: ANN001
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_staff)
