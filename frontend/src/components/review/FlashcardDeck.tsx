"use client";

import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Flashcard } from "@/components/review/Flashcard";
import { ReviewDueTime } from "@/components/review/ReviewDueTime";
import { useReviewMedia } from "@/components/review/useReviewMedia";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/api/common";
import type {
  Vocabulary,
  ReviewAnswerResponse,
  VocabularyBulkActionRequest,
  VocabularyBulkActionResponse,
} from "@/types/api/vocabulary";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

const PAGE_SIZE = 10;
const reviewPagePath = (page: number) =>
  `/api/my-vocabulary/vocabulary/?needs_review=true&page_size=${PAGE_SIZE}&page=${page}`;

export function FlashcardDeck({
  initialData,
  reviewUpdates = {},
  onStopReviewing,
}: {
  initialData: PaginatedResponse<Vocabulary>;
  reviewUpdates?: Record<number, ReviewAnswerResponse>;
  onStopReviewing?: (vocabularyId: number) => void;
}) {
  const t = useTranslations();

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
      onStopReviewing?.(row.id);
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
          {t("Retry loading cards")}</Button>
      ) : null}
      {!data.count ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {t("You have no senses enrolled in review.")}</p>
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
                    size="xs"
                    variant="ghost"
                    className="border-red-700/30 text-red-700 hover:border-red-700/50 hover:bg-red-500/10 hover:text-red-800 dark:border-red-400/30 dark:text-red-400 dark:hover:border-red-400/50 dark:hover:bg-red-400/10 dark:hover:text-red-300"
                    disabled={busy}
                    onClick={() => void stopReviewing(row)}
                  >
                    {stoppingId === row.id
                      ? <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
                      : <X aria-hidden="true" className="size-3" />}
                    {t("Stop reviewing")}</Button>}
                />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {t("Next review ·")} <ReviewDueTime value={
                    reviewUpdates[row.id] && reviewUpdates[row.id].version >= row.review_version
                      ? reviewUpdates[row.id].due_at : row.review_due_at
                  } />
                </p>
              </div>
            ))}
          </div>
          <nav
            aria-label={t("Review list pages")}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              variant="outline"
              disabled={page <= 1 || busy}
              onClick={() => void loadPage(page - 1)}
            >
              {t("Previous")}</Button>
            <span aria-live="polite" className="text-sm text-muted-foreground">
              {t("Page")} {Math.min(page, totalPages)}  {t("of {0} | {1} senses", { 0: totalPages, 1: data.count })}</span>
            <Button
              variant="outline"
              disabled={page >= totalPages || busy}
              onClick={() => void loadPage(page + 1)}
            >
              {t("Next")}</Button>
          </nav>
        </>
      )}
    </div>
  );
}
