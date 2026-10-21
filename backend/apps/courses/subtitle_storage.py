import secrets

from django.db import transaction
from django.utils.text import slugify


def subtitle_upload_path(instance, filename):
    from .models import Course

    with transaction.atomic():
        course = Course.objects.select_for_update().get(pk=instance.course_id)
        if not course.subtitle_folder:
            base = slugify(course.title)[:80] or "course"
            folder = base
            if Course.objects.filter(subtitle_folder=folder).exists():
                folder = f"{base}-{course.pk}"
            while Course.objects.filter(subtitle_folder=folder).exists():
                folder = f"{base}-{course.pk}-{secrets.token_hex(4)}"
            course.subtitle_folder = folder
            course.save(update_fields=["subtitle_folder"])
    # 12 hexadecimal characters (48 random bits); storage also guards collisions.
    return f"section_subtitles/{course.subtitle_folder}/section-{instance.pk}-{secrets.token_hex(6)}.vtt"


def delete_unreferenced_subtitle(storage, name):
    from .models import Section

    if name and not Section.objects.filter(subtitle_file=name).exists():
        storage.delete(name)
