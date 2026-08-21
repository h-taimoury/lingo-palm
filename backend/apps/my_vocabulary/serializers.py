from rest_framework import serializers

from apps.dictionary.models import Sense
from apps.dictionary.serializers import SenseSummarySerializer

from .models import Vocabulary
from .services import ACTIONS


class VocabularySerializer(serializers.ModelSerializer):
    """This serializer has only be used for SERIALIZATION of Vocabulary objects, both for 'list' action or for the custom action (bulk_action) response. It is not used for deserialization."""

    sense = SenseSummarySerializer(read_only=True)

    class Meta:
        model = Vocabulary
        fields = ("id", "sense", "already_known", "needs_review", "created_at")
        read_only_fields = fields


class VocabularyBulkActionSerializer(serializers.Serializer):
    """Input shape for the bulk-action endpoint: one fixed action applied to
    a manually selected list of sense IDs. All validation/data-shape concerns
    live here; the actual state changes happen in services.apply_bulk_action.
    """

    action = serializers.ChoiceField(choices=tuple(ACTIONS.keys()))
    sense_ids = serializers.PrimaryKeyRelatedField(
        queryset=Sense.objects.all(), many=True, allow_empty=False
    )
