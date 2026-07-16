from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import SubtitleWord, WordSenseMapping


@receiver(post_delete, sender=SubtitleWord)
def delete_empty_mapping_after_word_delete(
    sender, instance: SubtitleWord, **kwargs  # noqa: ANN001, ARG001
) -> None:
    mapping_id = instance.mapping_id
    if not WordSenseMapping.objects.filter(pk=mapping_id).exists():
        return
    if not SubtitleWord.objects.filter(mapping_id=mapping_id).exists():
        WordSenseMapping.objects.filter(pk=mapping_id).delete()
