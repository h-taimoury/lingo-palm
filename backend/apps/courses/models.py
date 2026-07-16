from django.db import models

from apps.dictionary.models import Sense


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    thumbnail = models.ImageField(upload_to="course_thumbnails/", null=True, blank=True)
    level = models.CharField(max_length=50, blank=True)
    is_published = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title", "id"]

    def __str__(self) -> str:
        return self.title


class Section(models.Model):
    course = models.ForeignKey(
        Course,
        related_name="sections",
        on_delete=models.CASCADE,
    )
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    video_url = models.URLField(max_length=1000)
    subtitle_file = models.FileField(upload_to="section_subtitles/")
    is_published = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["course_id", "order", "id"]

    def __str__(self) -> str:
        return f"{self.course.title} — {self.title}"


class WordSenseMapping(models.Model):
    senses = models.ManyToManyField(
        Sense,
        related_name="word_mappings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        words = ", ".join(self.subtitle_words.values_list("word", flat=True)[:4])
        return words or f"Mapping {self.pk}"


class SubtitleWord(models.Model):
    section = models.ForeignKey(
        Section,
        related_name="subtitle_words",
        on_delete=models.CASCADE,
    )
    mapping = models.ForeignKey(
        WordSenseMapping,
        related_name="subtitle_words",
        on_delete=models.CASCADE,
    )
    word = models.CharField(max_length=255)
    cue_id = models.CharField(max_length=255)
    cue_start_time = models.FloatField()
    cue_end_time = models.FloatField()
    previous_cue_start_time = models.FloatField(null=True, blank=True)
    previous_cue_end_time = models.FloatField(null=True, blank=True)
    next_cue_start_time = models.FloatField(null=True, blank=True)
    next_cue_end_time = models.FloatField(null=True, blank=True)
    position_in_cue = models.PositiveIntegerField()

    class Meta:
        ordering = ["section_id", "cue_id", "position_in_cue", "id"]
        indexes = [
            models.Index(fields=["section", "cue_id", "position_in_cue"]),
        ]

    def __str__(self) -> str:
        return f"{self.word} (cue {self.cue_id}, position {self.position_in_cue})"
