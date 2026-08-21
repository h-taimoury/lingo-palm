from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Vocabulary
from .serializers import VocabularyBulkActionSerializer, VocabularySerializer
from .services import apply_bulk_action


class VocabularyViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """A user's own learned-senses collection. Reads use plain list
    (optionally filtered by ?needs_review=true|false). All writes go through
    bulk-action: the user selects one or more senses and applies one of a
    fixed set of actions to them (see services.ACTIONS).
    """

    permission_classes = (IsAuthenticated,)
    serializer_class = VocabularySerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_fields = ("needs_review",)

    def get_queryset(self):
        return Vocabulary.objects.filter(user=self.request.user).select_related(
            "sense__entry"
        )

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
