from math import isfinite

from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.courses.models import SubtitleWord
from apps.courses.permissions import visible_courses
from apps.courses.serializers import SectionSerializer

from .models import Vocabulary
from .serializers import (
    ProgressQuerySerializer, ReviewAnswerSerializer, VocabularyBulkActionSerializer,
    VocabularyReviewSerializer, VocabularySerializer,
)
from .services import apply_bulk_action, get_progress, get_review_batch, record_review


class VocabularyPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100


class VocabularyViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """A learner's vocabulary, review enrollment, and scheduled review answers."""

    permission_classes = (IsAuthenticated,)
    serializer_class = VocabularySerializer
    pagination_class = VocabularyPagination
    filter_backends = (DjangoFilterBackend,)
    filterset_fields = ("needs_review", "already_known")

    def get_queryset(self):
        return Vocabulary.objects.filter(user=self.request.user).select_related(
            "sense__entry"
        )

    @action(detail=False, methods=["get"])
    def progress(self, request):
        query = ProgressQuerySerializer(data=request.query_params.dict())
        query.is_valid(raise_exception=True)
        result = get_progress(
            request.user, days=query.validated_data["days"], tz=query.validated_data["timezone"],
        )
        result["recently_learned"] = VocabularySerializer(
            result["recently_learned"], many=True, context=self.get_serializer_context(),
        ).data
        return Response(result)

    @action(detail=False, methods=["get"], url_path="review-batch")
    def review_batch(self, request):
        cards, due_count, next_due = get_review_batch(request.user)
        return Response({
            "results": VocabularySerializer(cards, many=True, context=self.get_serializer_context()).data,
            "due_count": due_count,
            "next_due_at": next_due,
        })

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        serializer = ReviewAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = record_review(request.user, pk, **serializer.validated_data)
        return Response(VocabularyReviewSerializer(result).data)

    @action(detail=True, methods=["get"])
    def clips(self, request, pk=None):
        vocabulary = self.get_object()
        if not settings.CLIP_REVIEW_ENABLED:
            return Response({"available": False})

        video_field = "local_video_url" if settings.DEBUG else "hosted_video_url"
        words = SubtitleWord.objects.filter(mapping__senses=vocabulary.sense_id).exclude(
            **{f"section__{video_field}": ""}
        )
        if not request.user.is_staff:
            words = words.filter(
                visible_courses(request.user, "section__course__"), section__is_published=True
            )
        words = words.select_related("section").order_by(
            "section_id", "cue_start_time", "cue_id", "id"
        )

        clips = {}
        sections = {}
        for word in words:
            key = (word.section_id, word.cue_id)
            if key in clips:
                continue
            cue_start, cue_end = word.cue_start_time, word.cue_end_time
            if not (isfinite(cue_start) and isfinite(cue_end) and 0 <= cue_start < cue_end):
                continue
            if word.section_id not in sections:
                sections[word.section_id] = SectionSerializer(word.section).data

            previous_start, previous_end = word.previous_cue_start_time, word.previous_cue_end_time
            next_start, next_end = word.next_cue_start_time, word.next_cue_end_time
            start, end = cue_start - 5, cue_end + 5
            if (
                previous_start is not None and previous_end is not None
                and 0 <= previous_start <= previous_end and isfinite(previous_end)
                and cue_start - previous_end <= 5
            ):
                start = min(cue_start, previous_start)
            if (
                next_start is not None and next_end is not None
                and 0 <= next_start <= next_end and isfinite(next_end)
                and next_start - cue_end <= 5
            ):
                end = max(cue_end, next_end)

            clips[key] = {
                "section": sections[word.section_id],
                "cue_id": word.cue_id,
                "start": max(0, start),
                "end": end,
            }
        return Response({"available": True, "clips": list(clips.values())})

    @action(detail=False, methods=["post"], url_path="bulk-action")
    def bulk_action(self, request):
        serializer = VocabularyBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = apply_bulk_action(
            user=request.user,
            action=serializer.validated_data["action"],
            senses=serializer.validated_data["sense_ids"],
        )

        if serializer.validated_data["action"] == "unset_learned":
            return Response(
                {
                    "detail": "The vocabulary instances for the requested senses were deleted.",
                    "sense_ids": sorted(result),
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            VocabularySerializer(result, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
