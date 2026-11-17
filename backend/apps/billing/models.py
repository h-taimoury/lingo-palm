from django.conf import settings
from django.db import models


class PaymentOrder(models.Model):
    class State(models.TextChoices):
        PENDING = "pending"
        FULFILLED = "fulfilled"
        FAILED = "failed"

    reference = models.UUIDField(unique=True, editable=False)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    amount = models.PositiveIntegerField()
    days = models.PositiveSmallIntegerField()
    sandbox = models.BooleanField()
    authority = models.CharField(max_length=36, null=True, unique=True, editable=False)
    receipt = models.CharField(max_length=64, blank=True)
    state = models.CharField(choices=State.choices, max_length=10, default=State.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    checked_at = models.DateTimeField(null=True, blank=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    resulting_expiry = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=("state", "sandbox", "checked_at"))]


class StaffGrant(models.Model):
    learner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="received_subscription_grants")
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="issued_subscription_grants")
    days = models.PositiveSmallIntegerField(choices=((7, "7 days"), (30, "30 days")))
    created_at = models.DateTimeField(auto_now_add=True)
    resulting_expiry = models.DateTimeField()

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(days__in=[7, 30]), name="valid_staff_grant_duration")]
