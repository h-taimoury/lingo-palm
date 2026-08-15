from django.conf import settings
from django.db import models

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
    mastered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "sense"], name="unique_user_sense_vocabulary"
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} — {self.sense}"
