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


class EntrySerializer(serializers.ModelSerializer):
    senses = SenseSerializer(many=True, read_only=True)

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
