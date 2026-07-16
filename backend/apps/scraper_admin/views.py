import logging

from django.db import IntegrityError
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dictionary.models import Entry
from apps.dictionary.serializers import EntrySerializer

from .serializers import RejectScrapeRequestSerializer, ScrapeWordRequestSerializer
from .services import (
    DuplicateScrapeError,
    EntriesInUseError,
    MissingEntriesError,
    MixedScrapeEntriesError,
    reject_scraped_entries,
    scrape_and_save_word,
)

logger = logging.getLogger(__name__)


class ScrapeWordView(APIView):
    permission_classes = (IsAdminUser,)

    def post(self, request):  # noqa: ANN001, ANN201
        serializer = ScrapeWordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        word = serializer.validated_data["word"]

        if Entry.objects.filter(word__iexact=word).exists():
            return Response(
                {"detail": f"{word!r} has already been scraped."},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            entries = scrape_and_save_word(word)
        except DuplicateScrapeError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except IntegrityError:
            logger.exception("Dictionary integrity error while scraping %s", word)
            return Response(
                {"detail": "The scraped data conflicts with existing dictionary data."},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as exc:  # typed scraper exceptions are imported lazily below
            return self._scraper_error_response(exc)

        return Response(
            {
                "detail": "Scrape completed and saved. Review the returned entries.",
                "entry_ids": [entry.id for entry in entries],
                "entries": EntrySerializer(
                    entries,
                    many=True,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def _scraper_error_response(self, exc: Exception) -> Response:
        from longman_scraper import (
            AudioDownloadError,
            PageLoadError,
            ScrapeError,
            WordNotFoundError,
        )

        if isinstance(exc, WordNotFoundError):
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        if isinstance(exc, (PageLoadError, AudioDownloadError)):
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        if isinstance(exc, ScrapeError):
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        logger.exception("Unexpected scraper error")
        return Response(
            {"detail": "An unexpected error occurred while scraping."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class RejectScrapeView(APIView):
    permission_classes = (IsAdminUser,)

    def delete(self, request):  # noqa: ANN001, ANN201
        serializer = RejectScrapeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry_ids = serializer.validated_data["entry_ids"]

        try:
            deleted_ids = reject_scraped_entries(entry_ids)
        except MissingEntriesError as exc:
            return Response(
                {"detail": str(exc), "missing_entry_ids": exc.missing_ids},
                status=status.HTTP_404_NOT_FOUND,
            )
        except MixedScrapeEntriesError:
            return Response(
                {"detail": "All entry IDs must belong to the same scraped word."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except EntriesInUseError:
            return Response(
                {"detail": "These entries cannot be rejected because one or more senses are in use."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"detail": "Scraped entries deleted.", "deleted_entry_ids": deleted_ids},
            status=status.HTTP_200_OK,
        )
