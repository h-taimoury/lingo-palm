from django.db import transaction
from rest_framework import serializers

from apps.dictionary.models import Entry, Sense
from apps.dictionary.serializers import SenseSummarySerializer

from .models import Vocabulary


class VocabularySerializer(serializers.ModelSerializer):
    sense = SenseSummarySerializer(read_only=True)

    class Meta:
        model = Vocabulary
        fields = ("id", "sense", "already_known", "needs_review", "created_at")
        read_only_fields = ("created_at", "id")


def _upsert(user, sense_ids, already_known, needs_review):
    """Create rows for any sense_ids the user doesn't have yet, and force
    already_known/needs_review to the given values on every row for
    sense_ids (whether just-created or pre-existing).
    """
    if not sense_ids:
        return Vocabulary.objects.none()

    existing_ids = set(
        Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).values_list(
            "sense_id", flat=True
        )
    )
    new_ids = [sid for sid in sense_ids if sid not in existing_ids]

    if new_ids:
        Vocabulary.objects.bulk_create(
            [
                Vocabulary(
                    user=user,
                    sense_id=sid,
                    already_known=already_known,
                    needs_review=needs_review,
                )
                for sid in new_ids
            ]
        )

    Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).update(
        already_known=already_known, needs_review=needs_review
    )

    return Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).select_related(
        "sense__entry"
    )


def _update_existing(user, sense_ids, **fields):
    """Update only rows that already exist for the user among sense_ids.
    Never creates new rows — used for actions that only make sense against
    a sense the user has already saved (the /my-vocabulary lists).
    """
    if not sense_ids:
        return Vocabulary.objects.none()

    Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).update(**fields)

    return Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).select_related(
        "sense__entry"
    )


def _delete(user, sense_ids):
    """Delete any existing rows for the user among sense_ids. Returns the
    set of sense_ids that actually had a row removed.
    """
    if not sense_ids:
        return set()

    queryset = Vocabulary.objects.filter(user=user, sense_id__in=sense_ids)
    deleted_sense_ids = set(queryset.values_list("sense_id", flat=True))
    queryset.delete()
    return deleted_sense_ids


_ACTIONS = {
    "set_already_known": lambda user, ids: _upsert(user, ids, True, False),
    "unset_already_known": lambda user, ids: _update_existing(
        user, ids, already_known=False, needs_review=True
    ),
    "set_learned": lambda user, ids: _upsert(user, ids, False, True),
    "unset_learned": _delete,
    "set_needs_review": lambda user, ids: _update_existing(user, ids, needs_review=True),
    "unset_needs_review": lambda user, ids: _update_existing(
        user, ids, needs_review=False
    ),
}


class VocabularyBulkActionSerializer(serializers.Serializer):
    """Applies one fixed action to a target set of senses for the requesting
    user. The target is exactly one of sense_ids / entry_id / word; whichever
    is given is resolved to a flat set of sense IDs before the action runs,
    so the action logic itself never needs to know which target type was used.
    """

    ACTION_CHOICES = tuple(_ACTIONS.keys())

    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    sense_ids = serializers.PrimaryKeyRelatedField(
        queryset=Sense.objects.all(), many=True, required=False
    )
    entry_id = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), required=False
    )
    word = serializers.CharField(
        max_length=255, trim_whitespace=True, allow_blank=False, required=False
    )

    def validate(self, attrs):
        provided = [key for key in ("sense_ids", "entry_id", "word") if key in attrs]
        if len(provided) != 1:
            raise serializers.ValidationError(
                "Exactly one of sense_ids, entry_id, or word must be provided."
            )
        return attrs

    def _resolve_sense_ids(self):
        data = self.validated_data
        if "sense_ids" in data:
            return {sense.id for sense in data["sense_ids"]}
        if "entry_id" in data:
            return set(data["entry_id"].senses.values_list("id", flat=True))
        return set(
            Sense.objects.filter(entry__word__iexact=data["word"]).values_list(
                "id", flat=True
            )
        )

    @transaction.atomic
    def save(self):
        user = self.context["request"].user
        sense_ids = self._resolve_sense_ids()
        return _ACTIONS[self.validated_data["action"]](user, sense_ids)