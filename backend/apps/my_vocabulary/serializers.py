from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from apps.dictionary.models import Sense
from apps.dictionary.serializers import SenseSummarySerializer

from .models import Vocabulary, VocabularyReview
from .services import ACTIONS


class VocabularySenseSerializer(SenseSummarySerializer):
    class Meta(SenseSummarySerializer.Meta):
        fields = (*SenseSummarySerializer.Meta.fields, "lex_unit")


class VocabularySerializer(serializers.ModelSerializer):
    """This serializer has only be used for SERIALIZATION of Vocabulary objects, both for 'list' action or for the custom action (bulk_action) response. It is not used for deserialization."""

    sense = VocabularySenseSerializer(read_only=True)

    class Meta:
        model = Vocabulary
        fields = (
            "id", "sense", "already_known", "needs_review", "created_at", "learned_at",
            "review_due_at", "reviewed_at", "review_version",
        )
        read_only_fields = fields


class ReviewAnswerSerializer(serializers.Serializer):
    submission_id = serializers.UUIDField()
    rating = serializers.ChoiceField(choices=(1, 3))
    version = serializers.IntegerField(min_value=0)


class ProgressQuerySerializer(serializers.Serializer):
    days = serializers.ChoiceField(choices=(7, 30, 90), default=30)
    timezone = serializers.CharField(default="UTC", max_length=100)

    def validate_timezone(self, value):
        try:
            return ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError("Choose a valid IANA time zone.")


class VocabularyReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = VocabularyReview
        fields = ("submission_id", "rating", "reviewed_at", "due_at", "version")
        read_only_fields = fields


class VocabularyBulkActionSerializer(serializers.Serializer):
    """Input shape for the bulk-action endpoint: one fixed action applied to
    a manually selected list of sense IDs. All validation/data-shape concerns
    live here; the actual state changes happen in services.apply_bulk_action.
    """

    action = serializers.ChoiceField(choices=tuple(ACTIONS.keys()))
    sense_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=-(2**63), max_value=2**63 - 1),
        allow_empty=False,
    )

    def validate_sense_ids(self, ids):
        senses = Sense.objects.in_bulk(ids)
        for sense_id in ids:
            if sense_id not in senses:
                raise serializers.ValidationError(
                    f'Invalid pk "{sense_id}" - object does not exist.',
                    code="does_not_exist",
                )
        return [senses[sense_id] for sense_id in ids]
