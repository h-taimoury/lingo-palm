from django.db.models import Prefetch
from rest_framework import filters, viewsets

from .models import Course, Section, SubtitleWord, WordSenseMapping
from .permissions import IsStaffOrPublishedReadOnly
from .serializers import (
    CourseSerializer,
    CourseSummarySerializer,
    SectionDetailSerializer,
    SectionSerializer,
    SubtitleWordSerializer,
    WordSenseMappingCreateSerializer,
    WordSenseMappingSerializer,
)


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "description", "level")
    ordering_fields = ("title", "level", "created_at")
    ordering = ("title", "id")

    def get_serializer_class(self):  # noqa: ANN201
        if self.action == "list":
            return CourseSummarySerializer
        return CourseSerializer

    def get_queryset(self):  # noqa: ANN201
        # If action is 'list', we don't need prefetch_related for sections
        if self.action == "list":
            return (
                Course.objects.all()
                if self.request.user.is_staff
                else Course.objects.filter(is_published=True)
            )

        section_queryset = Section.objects.all()
        course_queryset = Course.objects.all()
        if not self.request.user.is_staff:
            section_queryset = section_queryset.filter(is_published=True)
            course_queryset = course_queryset.filter(is_published=True)

        return course_queryset.prefetch_related(
            Prefetch("sections", queryset=section_queryset)
        )


class SectionViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "course__title")
    ordering_fields = ("course__title", "order", "created_at")
    ordering = ("course_id", "order", "id")

    def get_serializer_class(self):  # noqa: ANN201
        if self.action == "retrieve":
            return SectionDetailSerializer
        return SectionSerializer

    def get_queryset(self):
        mapping_queryset = WordSenseMapping.objects.prefetch_related(
            "senses__entry", "subtitle_words"
        )
        queryset = Section.objects.select_related("course").prefetch_related(
            Prefetch(
                "word_sense_mappings",
                queryset=mapping_queryset,
            )
        )
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(is_published=True, course__is_published=True)


class WordSenseMappingViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    queryset = WordSenseMapping.objects.select_related("section").prefetch_related(
        "senses__entry", "subtitle_words"
    )

    def get_serializer_class(self):
        if self.action == "create":
            return WordSenseMappingCreateSerializer
        return WordSenseMappingSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(
            section__is_published=True,
            section__course__is_published=True,
        )


class SubtitleWordViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    serializer_class = SubtitleWordSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = (
        "word",
        "mapping__section__title",
        "mapping__section__course__title",
    )
    ordering_fields = ("cue_id", "position_in_cue")
    ordering = ("mapping_id", "cue_id", "position_in_cue", "id")

    def get_queryset(self):
        queryset = SubtitleWord.objects.select_related(
            "mapping__section__course", "mapping"
        )
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(
            mapping__section__is_published=True,
            mapping__section__course__is_published=True,
        )
