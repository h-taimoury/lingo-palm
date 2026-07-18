from django.conf import settings
from rest_framework import serializers

from .models import Entry, Sense


class EntrySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = (
            "id",
            "word",
            "part_of_speech",
            "pronunciation",
        )


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


class SenseSerializer(serializers.ModelSerializer):
    entry = EntrySummarySerializer(read_only=True)
    entry_id = serializers.PrimaryKeyRelatedField(
        source="entry",
        queryset=Entry.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Sense
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


def _resolve_pronunciation_urls(pronunciation, request):  # noqa: ANN001, ANN201
    """Turn the bare audio filenames the scraper saves (e.g. 'book_Br.mp3')
    into URLs the frontend can actually fetch, the same way ImageField/FileField
    do automatically for other fields.
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


class EntrySerializer(serializers.ModelSerializer):
    senses = SenseSerializer(many=True, read_only=True)
    pronunciation = serializers.SerializerMethodField()

    class Meta:
        model = Entry
        fields = (
            "id",
            "word",
            "part_of_speech",
            "pronunciation",
            "frequency",
            "inflections",
            "register",
            "created_at",
            "senses",
        )
        read_only_fields = ("created_at",)

    def get_pronunciation(self, obj: Entry):  # noqa: ANN201
        return _resolve_pronunciation_urls(obj.pronunciation, self.context.get("request"))
