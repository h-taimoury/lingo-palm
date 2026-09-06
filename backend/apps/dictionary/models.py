from django.db import models


class Entry(models.Model):
    word = models.CharField(max_length=255, db_index=True)
    part_of_speech = models.CharField(max_length=100, blank=True, db_index=True)
    pronunciation = models.JSONField(null=True, blank=True)
    homonym_num = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )
    frequency = models.JSONField(default=list, blank=True)
    inflections = models.TextField(null=True, blank=True)
    register = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["word", "homonym_num", "id"]
        verbose_name_plural = "entries"

    def __str__(self) -> str:
        return f"{self.word} ({self.part_of_speech})"


class Sense(models.Model):
    entry = models.ForeignKey(
        Entry,
        related_name="senses",
        on_delete=models.CASCADE,
    )
    sense_number = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    definition = models.TextField()
    lex_unit = models.CharField(max_length=500, null=True, blank=True)
    geo = models.CharField(max_length=100, null=True, blank=True)
    register = models.CharField(max_length=100, null=True, blank=True)
    synonyms = models.JSONField(default=list, blank=True)
    opposites = models.JSONField(default=list, blank=True)
    examples = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = [
            "entry__word",
            "entry_id",
            "sense_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("entry", "title"),
                name="unique_sense_title_per_entry",
            )
        ]

    def __str__(self) -> str:
        return self.title
