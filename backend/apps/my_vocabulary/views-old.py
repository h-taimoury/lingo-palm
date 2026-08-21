from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Vocabulary
from .serializers import VocabularyBulkActionSerializer, VocabularySerializer


class VocabularyViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """A user's own learned-senses collection. No is_staff distinction here —
    every authenticated user manages only their own rows (see get_queryset).

    Reads use plain list (optionally filtered by ?needs_review=true|false).
    All writes go through bulk-action, since every place in the UI where a
    learner interacts with vocabulary rows operates on a target (specific
    senses, a whole entry, or a whole word) plus one of a fixed set of
    actions — see VocabularyBulkActionSerializer.
    """

    permission_classes = (IsAuthenticated,)
    serializer_class = VocabularySerializer

    def get_queryset(self):
        queryset = Vocabulary.objects.filter(user=self.request.user).select_related(
            "sense__entry"
        )
        needs_review = self.request.query_params.get("needs_review")
        if needs_review is not None:
            queryset = queryset.filter(needs_review=needs_review.lower() == "true")
        return queryset

    @action(detail=False, methods=["post"], url_path="bulk-action")
    def bulk_action(self, request):
        serializer = VocabularyBulkActionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        if serializer.validated_data["action"] == "unset_learned":
            return Response(
                {"deleted_sense_ids": sorted(result)}, status=status.HTTP_200_OK
            )

        return Response(
            VocabularySerializer(result, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )