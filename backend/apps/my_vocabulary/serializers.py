from django.db import transaction
from rest_framework import serializers

from apps.dictionary.models import Entry, Sense
from apps.dictionary.serializers import SenseSummarySerializer

from .models import Vocabulary


class VocabularySerializer(serializers.ModelSerializer):
    sense = SenseSummarySerializer(read_only=True)

    class Meta:
        model = Vocabulary
        fields = ("id", "sense", "already_known", "mastered", "created_at")
        read_only_fields = ("created_at",)


class VocabularyCreateSerializer(serializers.ModelSerializer):
    # Mirrors the entry_id/sense_id write-only pattern used in apps.dictionary.serializers.
    sense_id = serializers.PrimaryKeyRelatedField(
        source="sense", queryset=Sense.objects.all(), write_only=True
    )

    class Meta:
        model = Vocabulary
        fields = ("sense_id", "already_known", "mastered")

    def create(self, validated_data):
        # update_or_create so re-posting an already-learned sense (e.g. toggling
        # already_known) doesn't hit the unique_user_sense_vocabulary constraint.
        user = self.context["request"].user
        instance, _ = Vocabulary.objects.update_or_create(
            user=user,
            sense=validated_data["sense"],
            defaults={
                "already_known": validated_data.get("already_known", False),
                "mastered": validated_data.get("mastered", False),
            },
        )
        return instance

    def to_representation(self, instance):
        return VocabularySerializer(instance, context=self.context).data


def _bulk_mark_learned(user, sense_ids, already_known, mastered):
    """Create Vocabulary rows for any of sense_ids not already saved for this
    user, leaving existing rows untouched. Returns the full queryset for
    sense_ids (existing + newly created) so the view can echo back everything.
    """
    if not sense_ids:
        return Vocabulary.objects.none()

    existing_sense_ids = set(
        Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).values_list(
            "sense_id", flat=True
        )
    )
    new_sense_ids = [sid for sid in sense_ids if sid not in existing_sense_ids]

    Vocabulary.objects.bulk_create(
        [
            Vocabulary(
                user=user,
                sense_id=sid,
                already_known=already_known,
                mastered=mastered,
            )
            for sid in new_sense_ids
        ]
    )

    return Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).select_related(
        "sense__entry"
    )


class MarkEntryLearnedSerializer(serializers.Serializer):
    """'I know this word as this part of speech' — marks every sense of one Entry."""

    entry_id = serializers.PrimaryKeyRelatedField(queryset=Entry.objects.all())
    already_known = serializers.BooleanField(default=False)
    mastered = serializers.BooleanField(default=False)

    @transaction.atomic
    def save(self):
        user = self.context["request"].user
        entry = self.validated_data["entry_id"]
        sense_ids = list(entry.senses.values_list("id", flat=True))
        return _bulk_mark_learned(
            user,
            sense_ids,
            self.validated_data["already_known"],
            self.validated_data["mastered"],
        )


class MarkWordLearnedSerializer(serializers.Serializer):
    """'I know this word, all parts of speech, all senses' — marks every sense
    of every Entry sharing this word string (case-insensitive).
    """

    word = serializers.CharField(
        max_length=255, trim_whitespace=True, allow_blank=False
    )
    already_known = serializers.BooleanField(default=False)
    mastered = serializers.BooleanField(default=False)

    @transaction.atomic
    def save(self):
        user = self.context["request"].user
        word = self.validated_data["word"]
        sense_ids = list(
            Sense.objects.filter(entry__word__iexact=word).values_list("id", flat=True)
        )
        return _bulk_mark_learned(
            user,
            sense_ids,
            self.validated_data["already_known"],
            self.validated_data["mastered"],
        )
