from django.conf import settings
from rest_framework import serializers

from .models import Entry, Sense


def _resolve_pronunciation_urls(pronunciation, request):  # noqa: ANN001, ANN201
    """Turn the bare audio filenames the scraper saves (e.g. 'book_Br.mp3')
    into URLs the frontend can actually fetch.
    """
    if not pronunciation:
        return pronunciation

    resolved = dict(pronunciation)
    for key in ("br_audio", "am_audio"):
        filename = resolved.get(key)
        if not filename:
            continue
        path = f"{settings.MEDIA_URL}pronunciation_audios/{filename}"
        resolved[key] = request.build_absolute_uri(path) if request else path
    return resolved


class EntrySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ("id", "word", "part_of_speech", "homonym_num", "pronunciation")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["pronunciation"] = _resolve_pronunciation_urls(
            data.get("pronunciation"), self.context.get("request")
        )
        return data


class SenseSummarySerializer(serializers.ModelSerializer):
    entry = EntrySummarySerializer(read_only=True)

    class Meta:
        model = Sense
        fields = (
            "id",
            "title",
            "sense_number",
            "definition",
            "entry",
        )


def _validate_string_list(value) -> None:  # noqa: ANN001, ANN201
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise serializers.ValidationError("This value must be a list of strings.")


class SenseListSerializer(serializers.ListSerializer):
    """Enables SenseSerializer(data=[...], many=True).save() to issue a single
    bulk_create() instead of N individual .save() calls, while still running
    per-item validation via the child SenseSerializer.
    """

    def create(self, validated_data):  # noqa: ANN001, ANN201
        return Sense.objects.bulk_create([Sense(**item) for item in validated_data])

    # Default ListSerializer.create() implementation is this (from DRF source code):
    # def create(self, validated_data):
    #     return [
    #         self.child.create(attrs) for attrs in validated_data
    #     ]
    # Visit DRF documentation for more details: https://www.django-rest-framework.org/api-guide/serializers/#customizing-multiple-create


class SenseSerializer(serializers.ModelSerializer):
    entry = EntrySummarySerializer(read_only=True)
    entry_id = serializers.PrimaryKeyRelatedField(
        source="entry",
        queryset=Entry.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Sense
        list_serializer_class = SenseListSerializer
        fields = (
            "id",
            "entry",
            "entry_id",
            "sense_number",
            "title",
            "definition",
            "lex_unit",
            "geo",
            "register",
            "synonyms",
            "opposites",
            "examples",
        )

    def validate_synonyms(self, value):  # noqa: ANN201
        _validate_string_list(value)
        return value

    def validate_opposites(self, value):  # noqa: ANN201
        _validate_string_list(value)
        return value

    def validate_examples(self, value):  # noqa: ANN201
        if not isinstance(value, list):
            raise serializers.ValidationError("Examples must be a list.")

        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Each example must be an object/dictionary."
                )
            if set(item) - {"text", "usage"}:
                raise serializers.ValidationError(
                    "Examples may contain only 'text' and 'usage'."
                )
            text = item.get("text")
            usage = item.get("usage")
            if not isinstance(text, str) or not text.strip():
                raise serializers.ValidationError(
                    "Each example requires non-empty text."
                )
            if usage is not None and not isinstance(usage, str):
                raise serializers.ValidationError(
                    "Example usage must be a string or null."
                )
        return value


class EntrySerializer(serializers.ModelSerializer):
    senses = SenseSerializer(many=True, read_only=True)

    class Meta:
        model = Entry
        fields = (
            "id",
            "word",
            "part_of_speech",
            "homonym_num",
            "pronunciation",
            "frequency",
            "inflections",
            "register",
            "created_at",
            "senses",
        )
        read_only_fields = ("created_at",)

    def validate_pronunciation(self, value):  # noqa: ANN201
        if value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Pronunciation must be an object/dictionary or null."
            )
        if set(value) - {"text", "br_audio", "am_audio"}:
            raise serializers.ValidationError(
                "Pronunciation may contain only 'text', 'br_audio', and 'am_audio'."
            )
        for key in ("text", "br_audio", "am_audio"):
            item = value.get(key)
            if item is not None and not isinstance(item, str):
                raise serializers.ValidationError(
                    f"Pronunciation '{key}' must be a string or null."
                )
        return value

    def validate_frequency(self, value):  # noqa: ANN201
        _validate_string_list(value)
        return value

    def to_representation(self, instance):  # noqa: ANN001, ANN201
        data = super().to_representation(instance)
        data["pronunciation"] = _resolve_pronunciation_urls(
            data.get("pronunciation"), self.context.get("request")
        )
        return data
