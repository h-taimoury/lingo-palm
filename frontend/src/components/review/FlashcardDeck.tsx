"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Flashcard } from "@/components/review/Flashcard";
import { ReviewDueTime } from "@/components/review/ReviewDueTime";
import { useReviewMedia } from "@/components/review/useReviewMedia";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/api/common";
import type {
  Vocabulary,
  VocabularyBulkActionRequest,
  VocabularyBulkActionResponse,
} from "@/types/api/vocabulary";

const PAGE_SIZE = 10;
const reviewPagePath = (page: number) =>
  `/api/my-vocabulary/vocabulary/?needs_review=true&page_size=${PAGE_SIZE}&page=${page}`;

export function FlashcardDeck({
  initialData,
}: {
  initialData: PaginatedResponse<Vocabulary>;
}) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const { playPronunciation, openClips, media } = useReviewMedia(page);
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  async function loadPage(targetPage: number) {
    setBusy(true);
    setError(null);
    try {
      const nextData = await apiClient.get<PaginatedResponse<Vocabulary>>(
        reviewPagePath(targetPage),
      );
      setData(nextData);
      setPage(targetPage);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function stopReviewing(row: Vocabulary) {
    setBusy(true);
    setStoppingId(row.id);
    setError(null);
    try {
      const payload: VocabularyBulkActionRequest = {
        action: "unset_needs_review",
        sense_ids: [row.sense.id],
      };
      await apiClient.post<
        VocabularyBulkActionResponse,
        VocabularyBulkActionRequest
      >("/api/my-vocabulary/vocabulary/bulk-action/", payload);
      const remainingCount = Math.max(0, data.count - 1);
      const targetPage = Math.min(
        page,
        Math.max(1, Math.ceil(remainingCount / PAGE_SIZE)),
      );
      // Keep the successful removal even if refreshing the remaining list fails.
      setData((current) => ({
        ...current,
        count: remainingCount,
        results: current.results.filter((item) => item.id !== row.id),
      }));
      const nextData = await apiClient.get<PaginatedResponse<Vocabulary>>(
        reviewPagePath(targetPage),
      );
      setData(nextData);
      setPage(targetPage);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
      setStoppingId(null);
    }
  }

  return (
    <div aria-busy={busy}>
      <ApiErrorMessage error={error} />
      {media}
      {error ? (
        <Button
          className="mb-4"
          variant="outline"
          disabled={busy}
          onClick={() => void loadPage(Math.min(page, totalPages))}
        >
          Retry loading cards
        </Button>
      ) : null}
      {!data.count ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          You have no senses enrolled in review.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((row) => (
              <div key={`${page}-${row.id}`} className="w-full max-w-64">
                <Flashcard
                  row={row}
                  onPronunciation={() => playPronunciation(row)}
                  onClips={() => openClips(row)}
                  actions={<Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void stopReviewing(row)}
                  >
                    {stoppingId === row.id ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
                    Stop reviewing
                  </Button>}
                />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Next review · <ReviewDueTime value={row.review_due_at} />
                </p>
              </div>
            ))}
          </div>
          <nav
            aria-label="Flashcard pages"
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              variant="outline"
              disabled={page <= 1 || busy}
              onClick={() => void loadPage(page - 1)}
            >
              Previous
            </Button>
            <span aria-live="polite" className="text-sm text-muted-foreground">
              Page {Math.min(page, totalPages)} of {totalPages} | {data.count}{" "}
              senses
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages || busy}
              onClick={() => void loadPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
