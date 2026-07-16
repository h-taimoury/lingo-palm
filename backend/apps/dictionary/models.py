from django.db import models

from .validators import validate_examples, validate_pronunciation, validate_string_list


class Entry(models.Model):
    word = models.CharField(max_length=255, db_index=True)
    part_of_speech = models.CharField(max_length=100, db_index=True)
    pronunciation = models.JSONField(
        null=True,
        blank=True,
        validators=[validate_pronunciation],
    )
    frequency = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_string_list],
    )
    inflections = models.TextField(null=True, blank=True)
    register = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["word", "part_of_speech", "id"]
        verbose_name_plural = "entries"

    def __str__(self) -> str:
        return f"{self.word} ({self.part_of_speech})"


class Sense(models.Model):
    entry = models.ForeignKey(
        Entry,
        related_name="senses",
        on_delete=models.CASCADE,
    )
    sense_number = models.CharField(max_length=50, null=True, blank=True)
    title = models.CharField(max_length=255, unique=True)
    definition = models.TextField()
    lex_unit = models.CharField(max_length=500, null=True, blank=True)
    geo = models.CharField(max_length=100, null=True, blank=True)
    register = models.CharField(max_length=100, null=True, blank=True)
    synonyms = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_string_list],
    )
    opposites = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_string_list],
    )
    examples = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_examples],
    )

    class Meta:
        ordering = ["entry__word", "entry_id", "sense_number", "id"]

    def __str__(self) -> str:
        return self.title
