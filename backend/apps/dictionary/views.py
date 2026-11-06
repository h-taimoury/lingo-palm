from django.db import transaction
from django.db.models import Case, IntegerField, Q, Value, When
from django.db.models.functions import Trim
from django.utils.cache import patch_cache_control, patch_vary_headers
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.exceptions import ValidationError
from rest_framework import serializers

from .models import Entry, Sense
from .permissions import IsStaffOrAuthenticatedReadOnly
from .serializers import EntrySerializer, SenseSerializer


class TranslationReviewRowSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    expected_translation = serializers.CharField(allow_null=True, allow_blank=True, trim_whitespace=False)
    expected_short_translation = serializers.CharField(allow_null=True, allow_blank=True, trim_whitespace=False)
    translation = serializers.CharField(allow_blank=True, trim_whitespace=False)
    short_translation = serializers.CharField(allow_blank=True, max_length=100, trim_whitespace=False)


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

    @action(detail=False, methods=["get"], url_path="translation-review", permission_classes=[IsAdminUser])
    def translation_review(self, request):
        senses = Sense.objects.select_related("entry").annotate(
            clean_translation=Trim("translation")
        ).filter(
            Q(translation__isnull=True) | Q(clean_translation="") | Q(short_translation__isnull=True)
        )
        section_id = request.query_params.get("section_id", "").strip()
        if section_id:
            section_id = serializers.IntegerField(min_value=1).run_validation(section_id)
            # Use a subquery so repeated mappings cannot duplicate a sense in the random batch.
            senses = senses.filter(pk__in=Sense.objects.filter(
                word_mappings__section_id=section_id
            ).values("pk"))
        else:
            senses = senses.filter(pk__in=Sense.objects.filter(
                word_mappings__isnull=False
            ).values("pk"))
        if request.query_params.get("count_only") == "true":
            return Response({"remaining": senses.count()})
        senses = senses.order_by("?")[:30]
        return Response(self.get_serializer(senses, many=True).data)

    @action(detail=False, methods=["post"], url_path="translation-review-save", permission_classes=[IsAdminUser])
    def translation_review_save(self, request):
        serializer = TranslationReviewRowSerializer(data=request.data, many=True, allow_empty=False)
        serializer.is_valid(raise_exception=True)
        rows = serializer.validated_data
        ids = [row["id"] for row in rows]
        if len(rows) > 30 or len(set(ids)) != len(ids):
            raise ValidationError("Provide at most 30 unique senses.")
        with transaction.atomic():
            senses = Sense.objects.select_for_update().in_bulk(ids)
            for row in rows:
                sense = senses.get(row["id"])
                if sense is None:
                    raise ValidationError("A sense no longer exists. Reload the batch.")
                for field in ("translation", "short_translation"):
                    current = getattr(sense, field)
                    if current not in (row["expected_" + field], row[field]):
                        return Response(
                            {"detail": f"Sense {sense.pk} changed since export. Reload before saving."},
                            status=status.HTTP_409_CONFLICT,
                        )
            for row in rows:
                sense = senses[row["id"]]
                sense.translation = row["translation"]
                sense.short_translation = row["short_translation"]
                sense.save(update_fields=["translation", "short_translation"])
        return Response({"saved": len(rows)})

    def filter_queryset(self, queryset):  # noqa: ANN001, ANN201
        queryset = super().filter_queryset(queryset)
        search = self.request.query_params.get(filters.SearchFilter.search_param, "").strip()
        if search:
            # Rank before pagination so headword senses reach the first page.
            queryset = queryset.alias(
                exact_word_rank=Case(
                    When(entry__word__iexact=search, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            ).order_by("exact_word_rank", *queryset.query.order_by)
        return queryset

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
