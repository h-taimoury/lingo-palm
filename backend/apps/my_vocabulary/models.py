from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.dictionary.models import Sense


class Vocabulary(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="vocabulary",
        on_delete=models.CASCADE,
    )
    sense = models.ForeignKey(
        Sense,
        related_name="learned_by",
        on_delete=models.CASCADE,
    )
    already_known = models.BooleanField(default=False)
    needs_review = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    learned_at = models.DateTimeField(null=True, blank=True, editable=False)
    review_due_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_state = models.JSONField(default=dict, blank=True, editable=False)
    review_version = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "sense"], name="unique_user_sense_vocabulary"
            )
        ]
        indexes = [
            models.Index(fields=["user", "needs_review", "review_due_at"], name="vocabulary_review_due"),
        ]

    def __str__(self) -> str:
        return f"{self.user} — {self.sense}"


class VocabularyReview(models.Model):
    vocabulary = models.ForeignKey(Vocabulary, related_name="reviews", on_delete=models.CASCADE)
    submission_id = models.UUIDField()
    # Cleared answers retain their restore data and retry token without counting as a repetition.
    rating = models.PositiveSmallIntegerField(choices=[(1, "Forgot"), (3, "Remembered")], null=True)
    reviewed_at = models.DateTimeField()
    due_at = models.DateTimeField()
    version = models.PositiveIntegerField()
    previous_state = models.JSONField(null=True, editable=False)
    previous_due_at = models.DateTimeField(null=True, editable=False)
    previous_reviewed_at = models.DateTimeField(null=True, editable=False)
    last_submission_id = models.UUIDField(null=True, editable=False)

    class Meta:
        ordering = ["reviewed_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["vocabulary", "submission_id"], name="unique_review_submission"
            ),
            models.UniqueConstraint(fields=["vocabulary", "version"], name="unique_review_version"),
            models.UniqueConstraint(
                fields=["vocabulary", "last_submission_id"], name="unique_review_correction",
            ),
        ]
