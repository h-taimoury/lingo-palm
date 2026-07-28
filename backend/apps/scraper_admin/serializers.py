from rest_framework import serializers


class ScrapeWordRequestSerializer(serializers.Serializer):
    word = serializers.CharField(
        max_length=255, trim_whitespace=True, allow_blank=False
    )  # trim_whitespace=True and allow_blank=False are defaults. I just put them here to be more clear.


class RejectScrapeRequestSerializer(serializers.Serializer):
    entry_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
