from functools import partial

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import Section, SubtitleWord, WordSenseMapping
from .subtitle_storage import delete_unreferenced_subtitle


@receiver(pre_save, sender=Section)
def remember_previous_subtitle(sender, instance, **kwargs):
    instance._previous_subtitle = (
        Section.objects.filter(pk=instance.pk).values_list("subtitle_file", flat=True).first()
        if instance.pk else None
    )


@receiver(post_save, sender=Section)
def delete_replaced_subtitle(sender, instance, update_fields=None, **kwargs):
    if update_fields is not None and "subtitle_file" not in update_fields:
        return
    previous = getattr(instance, "_previous_subtitle", None)
    if previous and previous != instance.subtitle_file.name:
        transaction.on_commit(partial(delete_unreferenced_subtitle, instance.subtitle_file.storage, previous))


@receiver(post_delete, sender=Section)
def delete_section_subtitle(sender, instance, **kwargs):
    transaction.on_commit(partial(delete_unreferenced_subtitle, instance.subtitle_file.storage, instance.subtitle_file.name))


@receiver(post_delete, sender=SubtitleWord)
def delete_empty_mapping_after_word_delete(
    sender, instance: SubtitleWord, **kwargs  # noqa: ANN001, ARG001
) -> None:
    mapping_id = instance.mapping_id
    if not WordSenseMapping.objects.filter(pk=mapping_id).exists():
        return
    if not SubtitleWord.objects.filter(mapping_id=mapping_id).exists():
        WordSenseMapping.objects.filter(pk=mapping_id).delete()
