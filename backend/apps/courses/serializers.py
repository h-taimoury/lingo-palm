from django.db import transaction
from rest_framework import serializers

from apps.dictionary.models import Sense
from apps.dictionary.serializers import SenseSerializer, SenseSummarySerializer
from apps.my_vocabulary.models import Vocabulary

from .models import Course, Section, SubtitleWord, WordSenseMapping

# A workable naming convention for serializers: name by <Model><Role>Serializer, where <Role> comes from a small, fixed vocabulary:

# Suffix:	Meaning:
# (none)	Default read/write shape, used when there's only one reasonable shape
# Summary	Lightweight shape for list views or nested references (few fields, no deep nesting)
# Detail	Full shape for retrieve, typically with nested related objects
# Create	Dedicated input-only serializer with custom .create(), often nested/atomic
# Admin	    Elevated-permission variant with extra writable fields


class SectionProgressMixin:
    """Adds new_words_count / learned_percentage, computed for the requesting
    user, to any Section serializer that includes them in Meta.fields.

    Both fields share the same two queries, so results are cached per-section
    on the shared serializer context (self.context persists across all rows
    in a `many=True` call, so this caching also protects against recomputation
    when the mixin is reused across multiple sections in one response).
    """

    def _progress(self, section):
        cache = self.context.setdefault("_vocab_progress_cache", {})
        if section.id in cache:
            return cache[section.id]

        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            result = (None, None)
        else:
            taught_ids = set(
                Sense.objects.filter(word_mappings__section=section).values_list(
                    "id", flat=True
                )
            )
            if not taught_ids:
                result = (0, 0)
            else:
                learned_ids = set(
                    Vocabulary.objects.filter(
                        user=request.user, sense_id__in=taught_ids
                    ).values_list("sense_id", flat=True)
                )
                new_words = len(taught_ids - learned_ids)
                percentage = round(len(learned_ids) / len(taught_ids) * 100)
                result = (new_words, percentage)

        cache[section.id] = result
        return result

    def get_new_words_count(self, obj):
        return self._progress(obj)[0]

    def get_learned_percentage(self, obj):
        return self._progress(obj)[1]


class SectionSummarySerializer(SectionProgressMixin, serializers.ModelSerializer):
    new_words_count = serializers.SerializerMethodField()
    learned_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = (
            "id",
            "title",
            "order",
            "is_published",
            "new_words_count",
            "learned_percentage",
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
    senses = SenseSerializer(many=True, read_only=True)
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


class SubtitleWordCreateSerializer(serializers.ModelSerializer):
    # This serializer is only used in the below WordSenseMappingCreateSerializer for creating SubtitleWord instances when creating a new WordSenseMapping instance. It is not used for reading, updating or deleting SubtitleWord instances.
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
    subtitle_words = SubtitleWordCreateSerializer(many=True)

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


class SectionSerializer(serializers.ModelSerializer):

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


class TaughtSenseSerializer(serializers.Serializer):
    """One row in a section's taught-senses list — a dictionary sense taught
    by this section, annotated with the requesting user's Vocabulary state
    for it (if any). already_known/needs_review are null when is_learned is
    False, since there's no Vocabulary row to read them from.
    """

    sense = SenseSummarySerializer()
    is_learned = serializers.BooleanField()
    already_known = serializers.BooleanField(allow_null=True)
    needs_review = serializers.BooleanField(allow_null=True)


class SectionDetailSerializer(SectionProgressMixin, serializers.ModelSerializer):
    course = CourseSummarySerializer(read_only=True)
    word_sense_mappings = serializers.SerializerMethodField()
    new_words_count = serializers.SerializerMethodField()
    learned_percentage = serializers.SerializerMethodField()

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
            "new_words_count",
            "learned_percentage",
        )

    def get_word_sense_mappings(self, obj):
        request = self.context.get("request")
        # Relies on the Prefetch("word_sense_mappings", ...) done in
        # SectionViewSet.get_queryset — .all() here hits the prefetch cache,
        # not the DB, and so does mapping.senses.all() below (senses__entry
        # is prefetched too).
        mappings = list(obj.word_sense_mappings.all())
        visible_mappings = self._drop_fully_learned_mappings(mappings, request)

        return WordSenseMappingSerializer(
            visible_mappings, many=True, context=self.context
        ).data

    @staticmethod
    def _drop_fully_learned_mappings(mappings, request):
        """Filter mappings according to the requesting user.

        Staff users receive all mappings for authoring purposes.
        Non-staff authenticated users do not receive mappings for which
        they have already learned every attached sense.
        """
        if request and request.user.is_staff:
            return mappings

        if not request or not request.user.is_authenticated:
            return mappings

        all_sense_ids = {
            sense.id for mapping in mappings for sense in mapping.senses.all()
        }
        if not all_sense_ids:
            return mappings

        learned_ids = set(
            Vocabulary.objects.filter(
                user=request.user, sense_id__in=all_sense_ids
            ).values_list("sense_id", flat=True)
        )

        return [
            mapping
            for mapping in mappings
            if not {sense.id for sense in mapping.senses.all()}.issubset(learned_ids)
        ]
