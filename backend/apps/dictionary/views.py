from django.db.models import Q
from django.utils.cache import patch_cache_control, patch_vary_headers
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Entry, Sense
from .permissions import IsStaffOrAuthenticatedReadOnly
from .serializers import EntrySerializer, SenseSerializer


class EntryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrAuthenticatedReadOnly,)
    serializer_class = EntrySerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = (
        "word",
        "part_of_speech",
        "senses__title",
    )
    ordering_fields = ("word", "homonym_num", "part_of_speech", "created_at")
    ordering = ("word", "homonym_num", "part_of_speech", "id")

    def get_queryset(self):  # noqa: ANN201
        return Entry.objects.prefetch_related("senses").all()

    @action(detail=True, methods=["get"], url_path="full-word")
    def full_word(self, request, pk=None):
        entry = self.get_object()
        entries = self.get_queryset().filter(word__iexact=entry.word).order_by(
            "part_of_speech", "homonym_num", "id"
        )
        response = Response(self.get_serializer(entries, many=True).data)
        patch_cache_control(response, private=True, max_age=86400)
        patch_vary_headers(response, ("Cookie",))
        return response

    def destroy(self, request, *args, **kwargs):  # noqa: ANN001, ANN201
        instance = self.get_object()
        if Sense.objects.filter(entry=instance, word_mappings__isnull=False).exists():
            return Response(
                {
                    "detail": (
                        "This entry cannot be deleted because one or more of its "
                        "senses are used in a course mapping."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class SenseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrAuthenticatedReadOnly,)
    serializer_class = SenseSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "entry__word", "lex_unit")
    ordering_fields = ("title", "entry__word", "sense_number")
    ordering = (
        "entry__word",
        "entry__homonym_num",
        "entry__part_of_speech",
        "sense_number",
        "id",
    )

    def get_queryset(self):  # noqa: ANN201
        queryset = Sense.objects.select_related("entry").all()
        if self.request.query_params.get("needs_translation", "").lower() == "true":
            queryset = queryset.filter(
                Q(translation__isnull=True) | Q(translation=""),
                word_mappings__isnull=False,
            ).distinct()
        return queryset

    def destroy(self, request, *args, **kwargs):  # noqa: ANN001, ANN201
        instance = self.get_object()
        if instance.word_mappings.exists():
            return Response(
                {
                    "detail": "This sense cannot be deleted because it is used in a course mapping."
                },
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)
