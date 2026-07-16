from rest_framework import serializers


class ScrapeWordRequestSerializer(serializers.Serializer):
    word = serializers.CharField(max_length=255, trim_whitespace=True)

    def validate_word(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("A word is required.")
        return value


class RejectScrapeRequestSerializer(serializers.Serializer):
    entry_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
