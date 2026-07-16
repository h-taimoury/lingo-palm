from django.db.models import Prefetch
from rest_framework import filters, status, viewsets
from rest_framework.response import Response

from .models import Course, Section, SubtitleWord, WordSenseMapping
from .permissions import IsStaffOrPublishedReadOnly
from .serializers import (
    CourseSerializer,
    SectionDetailSerializer,
    SectionWriteSerializer,
    SubtitleWordSerializer,
    WordSenseMappingCreateSerializer,
    WordSenseMappingSerializer,
)


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    serializer_class = CourseSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "description", "level")
    ordering_fields = ("title", "level", "created_at")
    ordering = ("title", "id")

    def get_queryset(self):  # noqa: ANN201
        section_queryset = Section.objects.all()
        if not self.request.user.is_staff:
            section_queryset = section_queryset.filter(is_published=True)
        queryset = Course.objects.prefetch_related(
            Prefetch("sections", queryset=section_queryset, to_attr="visible_sections")
        )
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(is_published=True)


class SectionViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "course__title")
    ordering_fields = ("course__title", "order", "created_at")
    ordering = ("course_id", "order", "id")

    def get_serializer_class(self):  # noqa: ANN201
        if self.action == "retrieve":
            return SectionDetailSerializer
        return SectionWriteSerializer

    def get_queryset(self):  # noqa: ANN201
        word_queryset = SubtitleWord.objects.select_related("mapping").prefetch_related(
            "mapping__senses__entry"
        )
        queryset = Section.objects.select_related("course").prefetch_related(
            Prefetch(
                "subtitle_words",
                queryset=word_queryset,
                to_attr="prefetched_subtitle_words",
            )
        )
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(is_published=True, course__is_published=True)


class WordSenseMappingViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    queryset = WordSenseMapping.objects.prefetch_related(
        "senses__entry", "subtitle_words"
    )

    def get_serializer_class(self):  # noqa: ANN201
        if self.action == "create":
            return WordSenseMappingCreateSerializer
        return WordSenseMappingSerializer

    def get_queryset(self):  # noqa: ANN201
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(
            subtitle_words__section__is_published=True,
            subtitle_words__section__course__is_published=True,
        ).distinct()


class SubtitleWordViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrPublishedReadOnly,)
    serializer_class = SubtitleWordSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("word", "section__title", "section__course__title")
    ordering_fields = ("cue_id", "position_in_cue")
    ordering = ("section_id", "cue_id", "position_in_cue", "id")

    def get_queryset(self):  # noqa: ANN201
        queryset = SubtitleWord.objects.select_related("section__course", "mapping")
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(
            section__is_published=True,
            section__course__is_published=True,
        )

    def destroy(self, request, *args, **kwargs):  # noqa: ANN001, ANN201
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
