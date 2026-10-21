from django.db import models
from django.db.models.functions import Coalesce, Trim


class Entry(models.Model):
    word = models.CharField(max_length=255, db_index=True)
    part_of_speech = models.CharField(max_length=100, blank=True, db_index=True)
    pronunciation = models.JSONField(null=True, blank=True)
    # Longman has two distinct "Junior" entries with no POS or homonym number.
    # Their source anchors distinguish them; blank preserves older/manual entries.
    source_entry_id = models.CharField(max_length=255, blank=True, default="")
    homonym_num = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )
    frequency = models.JSONField(default=list, blank=True)
    level = models.JSONField(null=True, blank=True, default=None)
    inflections = models.TextField(null=True, blank=True)
    register = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["word", "homonym_num", "id"]
        verbose_name_plural = "entries"
        constraints = [
            models.UniqueConstraint(
                Trim("word"),
                Trim("part_of_speech"),
                Coalesce("homonym_num", models.Value(-1)),
                name="unique_dictionary_entry_identity",
                condition=models.Q(source_entry_id=""),
            ),
            models.UniqueConstraint(
                Trim("word"), Trim("source_entry_id"),
                # Anchors are scoped by headword, not assumed globally unique.
                condition=~models.Q(source_entry_id=""),
                name="unique_dictionary_source_entry",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.word} ({self.part_of_speech})"


def entry_identity_conflicts(word, part_of_speech, homonym_num, source_entry_id=""):
    """Match source identities, conservatively guarding unidentified legacy rows."""
    entries = Entry.objects.annotate(
        identity_word=Trim("word"), identity_pos=Trim("part_of_speech"),
    ).filter(identity_word=word.strip())
    legacy_identity = models.Q(identity_pos=part_of_speech.strip(), homonym_num=homonym_num)
    if source_entry_id:
        return entries.filter(
            models.Q(source_entry_id=source_entry_id.strip()) |
            (models.Q(source_entry_id="") & legacy_identity)
        )
    return entries.filter(legacy_identity)


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
    translation = models.TextField(null=True, blank=True)
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
