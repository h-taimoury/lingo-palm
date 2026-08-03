from collections import OrderedDict
from typing import Any

from django.db import transaction
from rest_framework import serializers

from apps.dictionary.models import Sense
from apps.dictionary.serializers import SenseSummarySerializer

from .models import Course, Section, SubtitleWord, WordSenseMapping


def _cue_sort_key(word: SubtitleWord) -> tuple[Any, int, int]:
    try:
        cue: Any = (0, int(word.cue_id))
    except (TypeError, ValueError):
        cue = (1, str(word.cue_id))
    return cue, word.position_in_cue, word.id


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


class WordSenseMappingCreateSerializer(serializers.Serializer):
    section_id = serializers.PrimaryKeyRelatedField(
        source="section",
        queryset=Section.objects.all(),
    )
    sense_ids = serializers.PrimaryKeyRelatedField(
        source="senses",
        queryset=Sense.objects.all(),
        many=True,
    )
    subtitle_words = MappingSubtitleWordInputSerializer(many=True)

    def validate_sense_ids(self, value):  # noqa: ANN001, ANN201
        if not value:
            raise serializers.ValidationError("At least one sense is required.")
        return value

    def validate_subtitle_words(self, value):  # noqa: ANN001, ANN201
        if not value:
            raise serializers.ValidationError("At least one subtitle word is required.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        section = validated_data["section"]
        senses = validated_data["senses"]
        words = validated_data["subtitle_words"]

        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.set(senses)
        SubtitleWord.objects.bulk_create(
            [SubtitleWord(mapping=mapping, **word) for word in words]
        )
        return mapping

    def to_representation(self, instance):  # noqa: ANN001, ANN201
        instance = WordSenseMapping.objects.prefetch_related(
            "senses__entry", "subtitle_words"
        ).get(pk=instance.pk)
        return WordSenseMappingSerializer(instance, context=self.context).data


class SectionWriteSerializer(serializers.ModelSerializer):
    course_id = serializers.PrimaryKeyRelatedField(
        source="course",
        queryset=Course.objects.all(),
    )

    class Meta:
        model = Section
        fields = (
            "id",
            "course_id",
            "title",
            "order",
            "video_url",
            "subtitle_file",
            "is_published",
            "created_at",
        )
        read_only_fields = ("created_at",)


class SectionDetailSerializer(serializers.ModelSerializer):
    course = serializers.SerializerMethodField()
    word_sense_mappings = serializers.SerializerMethodField()

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

    def get_course(self, obj: Section) -> dict[str, Any]:
        return {"id": obj.course_id, "title": obj.course.title}

    def get_word_sense_mappings(self, obj: Section) -> list[dict[str, Any]]:
        mappings = getattr(obj, "prefetched_word_sense_mappings", None)
        if mappings is None:
            mappings = list(
                obj.word_sense_mappings.prefetch_related(
                    "senses__entry", "subtitle_words"
                )
            )

        words_with_mapping = [
            (word, mapping)
            for mapping in mappings
            for word in mapping.subtitle_words.all()
        ]

        grouped: OrderedDict[int, dict[str, Any]] = OrderedDict()
        for word, mapping in sorted(
            words_with_mapping, key=lambda pair: _cue_sort_key(pair[0])
        ):
            if mapping.id not in grouped:
                grouped[mapping.id] = {
                    "id": mapping.id,
                    "senses": SenseSummarySerializer(
                        mapping.senses.all(), many=True, context=self.context
                    ).data,
                    "subtitle_words": [],
                }
            grouped[mapping.id]["subtitle_words"].append(
                SubtitleWordSerializer(word, context=self.context).data
            )
        return list(grouped.values())
