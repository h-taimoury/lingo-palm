from rest_framework import filters, viewsets

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


class SenseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsStaffOrAuthenticatedReadOnly,)
    serializer_class = SenseSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "entry__word", "definition", "lex_unit")
    ordering_fields = ("title", "entry__word", "sense_number")
    ordering = ("title",)

    def get_queryset(self):  # noqa: ANN201
        return Sense.objects.select_related("entry").all()
