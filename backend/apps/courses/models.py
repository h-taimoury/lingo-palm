from django.core.exceptions import ValidationError
from django.db import models, transaction

from .subtitle_storage import subtitle_upload_path

from apps.dictionary.models import Sense

COURSE_LEVEL_CHOICES = [
    ("Beginner", "Beginner"),
    ("Intermediate", "Intermediate"),
    ("Advanced", "Advanced"),
]


class Course(models.Model):
    subtitle_folder = models.CharField(max_length=120, unique=True, null=True, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    thumbnail = models.ImageField(upload_to="course_thumbnails/", null=True, blank=True)
    level = models.CharField(
        max_length=50, choices=COURSE_LEVEL_CHOICES, default="Beginner"
    )
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
    subtitle_file = models.FileField(upload_to=subtitle_upload_path, max_length=255)
    is_published = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Obtain the section ID before storing its first uploaded file.
        if self.pk is None and self.subtitle_file and not self.subtitle_file._committed:
            upload = self.subtitle_file
            with transaction.atomic():
                self.subtitle_file = ""
                super().save(*args, **kwargs)
                self.subtitle_file = upload
                super().save(update_fields=["subtitle_file"])
            return
        return super().save(*args, **kwargs)

    class Meta:
        ordering = ["course_id", "order", "id"]

    def __str__(self) -> str:
        return f"{self.course.title} — {self.title}"


class WordSenseMapping(models.Model):
    section = models.ForeignKey(
        Section,
        related_name="word_sense_mappings",
        on_delete=models.CASCADE,
    )
    senses = models.ManyToManyField(
        Sense,
        related_name="word_mappings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["section_id", "id"]

    def clean(self):
        super().clean()
        if self.pk and self.subtitle_words.exclude(section_id=self.section_id).exists():
            raise ValidationError({"section": "A mapping with subtitle words cannot be moved to another section."})

    def __str__(self) -> str:
        words = ", ".join(self.subtitle_words.values_list("word", flat=True)[:4])
        return words or f"Mapping {self.pk}"


class SubtitleWordQuerySet(models.QuerySet):
    def bulk_create(self, objs, *args, **kwargs):
        # bulk_create bypasses save(); derive the internal section key here too.
        objs = list(objs)
        sections = dict(
            WordSenseMapping.objects.using(self.db)
            .filter(pk__in={obj.mapping_id for obj in objs})
            .values_list("pk", "section_id")
        )
        for obj in objs:
            obj.section_id = sections[obj.mapping_id]
        return super().bulk_create(objs, *args, **kwargs)


class SubtitleWord(models.Model):
    # Denormalized for a database uniqueness constraint. Database triggers keep
    # this key consistent with mapping.section, including for direct SQL writes.
    section = models.ForeignKey(Section, on_delete=models.CASCADE, editable=False)
    objects = SubtitleWordQuerySet.as_manager()

    mapping = models.ForeignKey(
        WordSenseMapping,
        related_name="subtitle_words",
        on_delete=models.CASCADE,
    )
    word = models.CharField(max_length=255)
    cue_id = models.PositiveIntegerField()
    cue_start_time = models.FloatField()
    cue_end_time = models.FloatField()
    previous_cue_start_time = models.FloatField(null=True, blank=True)
    previous_cue_end_time = models.FloatField(null=True, blank=True)
    next_cue_start_time = models.FloatField(null=True, blank=True)
    next_cue_end_time = models.FloatField(null=True, blank=True)
    position_in_cue = models.PositiveIntegerField()

    class Meta:
        ordering = ["mapping_id", "cue_id", "position_in_cue", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["section", "cue_id", "word", "position_in_cue"],
                name="unique_subtitle_occurrence_per_section",
            ),
        ]
        indexes = [
            models.Index(fields=["mapping", "cue_id", "position_in_cue"]),
        ]

    def clean(self):
        super().clean()
        if self.mapping_id:
            self.section_id = self.mapping.section_id
            if type(self).objects.filter(
                section_id=self.section_id, cue_id=self.cue_id,
                word=self.word, position_in_cue=self.position_in_cue,
            ).exclude(pk=self.pk).exists():
                raise ValidationError("This subtitle occurrence already belongs to a mapping.")

    def save(self, *args, **kwargs):
        self.section_id = self.mapping.section_id
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {"section"}
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.word} (cue {self.cue_id}, position {self.position_in_cue})"
