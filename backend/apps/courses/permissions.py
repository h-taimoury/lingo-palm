from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffOrPublishedReadOnly(BasePermission):
    """Staff may author; learner reads are filtered by publication and access."""

    def has_permission(self, request, view) -> bool:  # noqa: ANN001
        if request.method in SAFE_METHODS:
            return settings.COURSE_SUBSCRIPTIONS_ENABLED or request.user.is_authenticated
        return bool(request.user.is_staff)


def has_paid_access(user):
    if user.is_staff:
        return True
    if not user.is_authenticated:
        return False
    if not settings.COURSE_SUBSCRIPTIONS_ENABLED:
        return True
    ends_at = user.subscription_ends_at
    return ends_at is not None and ends_at > timezone.now()


def visible_courses(user, prefix=""):
    if user.is_staff:
        return Q()
    published = Q(**{f"{prefix}is_published": True})
    return published if has_paid_access(user) else published & Q(**{f"{prefix}is_free": True})
