from rest_framework import filters, status, viewsets
from rest_framework.response import Response

from .models import Entry, Sense
from .permissions import IsStaffOrAuthenticatedReadOnly
from .serializers import EntrySerializer, SenseSerializer


class EntryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrAuthenticatedReadOnly,)
    serializer_class = EntrySerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("word", "part_of_speech", "senses__title", "senses__definition")
    ordering_fields = ("word", "part_of_speech", "created_at")
    ordering = ("word", "part_of_speech", "id")

    def get_queryset(self):  # noqa: ANN201
        return Entry.objects.prefetch_related("senses").all()

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
    search_fields = ("title", "entry__word", "definition", "lex_unit")
    ordering_fields = ("title", "entry__word", "sense_number")
    ordering = ("title",)

    def get_queryset(self):  # noqa: ANN201
        return Sense.objects.select_related("entry").all()

    def destroy(self, request, *args, **kwargs):  # noqa: ANN001, ANN201
        instance = self.get_object()
        if instance.word_mappings.exists():
            return Response(
                {"detail": "This sense cannot be deleted because it is used in a course mapping."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)
