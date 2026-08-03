from django.db import transaction
from rest_framework import serializers

from apps.dictionary.models import Sense
from apps.dictionary.serializers import SenseSummarySerializer

from .models import Course, Section, SubtitleWord, WordSenseMapping


class SectionSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = (
            "id",
            "title",
            "order",
            "is_published",
        )


class CourseSerializer(serializers.ModelSerializer):

    sections = SectionSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "description",
            "thumbnail",
            "level",
            "is_published",
            "created_at",
            "sections",
        )
        read_only_fields = ("created_at",)


class CourseSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "description",
            "thumbnail",
            "level",
            "is_published",
            "created_at",
        )
        read_only_fields = ("created_at",)


class SubtitleWordSerializer(serializers.ModelSerializer):

    class Meta:
        model = SubtitleWord
        fields = (
            "id",
            "mapping",
            "word",
            "cue_id",
            "cue_start_time",
            "cue_end_time",
            "previous_cue_start_time",
            "previous_cue_end_time",
            "next_cue_start_time",
            "next_cue_end_time",
            "position_in_cue",
        )


class WordSenseMappingSerializer(serializers.ModelSerializer):
    senses = SenseSummarySerializer(many=True, read_only=True)
    sense_ids = serializers.PrimaryKeyRelatedField(
        source="senses",
        queryset=Sense.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    subtitle_words = SubtitleWordSerializer(many=True, read_only=True)

    class Meta:
        model = WordSenseMapping
        fields = (
            "id",
            "senses",
            "sense_ids",
            "subtitle_words",
            "created_at",
        )
        read_only_fields = ("created_at",)

    def validate_sense_ids(self, value):  # noqa: ANN001, ANN201
        # Pay attention that this serializer is not used for creating a new WordSenseMapping instance, but for reading the existing ones,updating and deleting them (RUD operations). Note that the only field in WordSenseMapping model instances that can get updated here is 'senses' field because we haven't included the 'section' field here on purpose because we don't want to let the section of a mapping to get updated. If the senses field is getting updated, we need to check that it's not an empty list and at least one sense is provided.
        if not value:
            raise serializers.ValidationError("At least one sense is required.")
        return value


class MappingSubtitleWordInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubtitleWord
        fields = (
            "word",
            "cue_id",
            "cue_start_time",
            "cue_end_time",
            "previous_cue_start_time",
            "previous_cue_end_time",
            "next_cue_start_time",
            "next_cue_end_time",
            "position_in_cue",
        )


class WordSenseMappingCreateSerializer(serializers.ModelSerializer):
    subtitle_words = MappingSubtitleWordInputSerializer(many=True)

    class Meta:
        model = WordSenseMapping
        fields = ("section", "senses", "subtitle_words")

    def validate_senses(self, value):
        if not value:
            raise serializers.ValidationError("At least one sense is required.")
        return value

    def validate_subtitle_words(self, value):
        if not value:
            raise serializers.ValidationError("At least one subtitle word is required.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        section = validated_data["section"]
        senses = validated_data["senses"]
        words = validated_data.pop("subtitle_words")

        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.set(senses)
        SubtitleWord.objects.bulk_create(
            [SubtitleWord(mapping=mapping, **word) for word in words]
        )
        return mapping

    def to_representation(self, instance):
        instance = (
            WordSenseMapping.objects.select_related("section")
            .prefetch_related("senses__entry", "subtitle_words")
            .get(pk=instance.pk)
        )
        return WordSenseMappingSerializer(instance, context=self.context).data


class SectionWriteSerializer(serializers.ModelSerializer):

    class Meta:
        model = Section
        fields = (
            "id",
            "course",
            "title",
            "order",
            "video_url",
            "subtitle_file",
            "is_published",
            "created_at",
        )
        read_only_fields = ("created_at",)


class SectionDetailSerializer(serializers.ModelSerializer):
    course = CourseSummarySerializer(read_only=True)
    word_sense_mappings = WordSenseMappingSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = (
            "id",
            "course",
            "title",
            "order",
            "video_url",
            "subtitle_file",
            "is_published",
            "word_sense_mappings",
        )
