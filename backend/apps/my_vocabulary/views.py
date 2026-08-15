from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Vocabulary
from .serializers import (
    MarkEntryLearnedSerializer,
    MarkWordLearnedSerializer,
    VocabularyCreateSerializer,
    VocabularySerializer,
)


class VocabularyViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """A user's own learned-senses collection. No is_staff distinction here —
    every authenticated user manages only their own rows (see get_queryset).
    """

    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Vocabulary.objects.filter(user=self.request.user).select_related(
            "sense__entry"
        )

    def get_serializer_class(self):
        if self.action == "create":
            return VocabularyCreateSerializer
        return VocabularySerializer

    @action(detail=False, methods=["post"], url_path="mark-entry-learned")
    def mark_entry_learned(self, request):
        serializer = MarkEntryLearnedSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        queryset = serializer.save()
        return Response(
            VocabularySerializer(
                queryset, many=True, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="mark-word-learned")
    def mark_word_learned(self, request):
        serializer = MarkWordLearnedSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        queryset = serializer.save()
        return Response(
            VocabularySerializer(
                queryset, many=True, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )
