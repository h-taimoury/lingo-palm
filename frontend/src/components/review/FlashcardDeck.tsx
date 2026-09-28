"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { TranslationPopover } from "@/components/video-player/learning/TranslationPopover";
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
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [page],
  );

  function playPronunciation(row: Vocabulary) {
    audioRef.current?.pause();
    audioRef.current = null;
    setAudioError(false);
    const url = row.sense.entry.pronunciation?.am_audio;
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    void audio.play().catch(() => {
      if (audioRef.current === audio) setAudioError(true);
    });
  }

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

  async function markReviewed(row: Vocabulary) {
    setBusy(true);
    setReviewingId(row.id);
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
      // Remove the reviewed card even if refreshing the remaining queue fails.
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
      setReviewingId(null);
    }
  }

  return (
    <div aria-busy={busy}>
      <ApiErrorMessage error={error} />
      {audioError ? (
        <p role="status" className="mb-4 text-sm text-destructive">
          The American pronunciation audio could not be played.
        </p>
      ) : null}
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
          Your review queue is empty.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((row) => (
              <Flashcard
                key={`${page}-${row.id}`}
                row={row}
                busy={busy}
                reviewing={reviewingId === row.id}
                onReviewed={() => void markReviewed(row)}
                onPronunciation={() => playPronunciation(row)}
              />
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

function Flashcard({
  row,
  busy,
  reviewing,
  onReviewed,
  onPronunciation,
}: {
  row: Vocabulary;
  busy: boolean;
  reviewing: boolean;
  onReviewed: () => void;
  onPronunciation: () => void;
}) {
  const [halfTurns, setHalfTurns] = useState(0);
  const flipped = halfTurns % 2 === 1;
  const meaningLabel =
    row.sense.sense_number != null
      ? `Meaning number ${row.sense.sense_number} of word ${row.sense.entry.word} as ${row.sense.entry.part_of_speech}`
      : "Vocabulary sense";

  function flipCard() {
    setHalfTurns((value) => value + 1);
    onPronunciation();
  }
  return (
    <div className="w-full max-w-64">
      <div className="group relative w-full rounded-2xl text-center transition-transform duration-200 [perspective:1200px] motion-safe:hover:-translate-y-1 motion-reduce:transition-none">
        <button
          type="button"
          onClick={flipCard}
          aria-label={`${flipped ? "Show sense" : "Reveal definition"} for ${row.sense.entry.word}`}
          aria-pressed={flipped}
          className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        />
        <span
          className="pointer-events-none grid w-full transition-transform duration-500 ease-in-out [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: `rotateY(${halfTurns * 180}deg)` }}
        >
          <span
            aria-hidden={flipped}
            inert={flipped}
            className="relative col-start-1 row-start-1 flex min-h-64 min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-t-4 border-orange-200 border-t-primary bg-linear-to-br from-orange-50 via-white to-amber-100 px-4 py-6 text-card-foreground shadow-md shadow-orange-950/10 transition-shadow [backface-visibility:hidden] [-webkit-backface-visibility:hidden] group-hover:shadow-lg group-hover:shadow-orange-950/15 dark:border-orange-900 dark:border-t-primary dark:from-orange-950 dark:via-card dark:to-amber-950 dark:shadow-black/25"
          >
            <span className="max-w-full text-3xl font-bold tracking-tight text-orange-950 [overflow-wrap:anywhere] dark:text-orange-50">
              {row.sense.entry.word}
            </span>
            <span className="mt-4 rounded-lg bg-orange-900/5 px-3 py-1 text-sm font-medium italic text-orange-800 dark:bg-orange-200/10 dark:text-orange-200">
              {row.sense.entry.part_of_speech}
            </span>
            <button
              type="button"
              title={meaningLabel}
              aria-label={meaningLabel}
              onClick={flipCard}
              className="pointer-events-auto mt-2 rounded-full border border-orange-200/80 bg-white/70 px-2.5 py-1 text-xs font-semibold tracking-wide text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-orange-800 dark:bg-orange-950/70 dark:text-orange-200"
            >
              {row.sense.sense_number ?? "Vocabulary sense"}
            </button>
          </span>
          <span
            aria-hidden={!flipped}
            inert={!flipped}
            className="relative col-start-1 row-start-1 flex min-h-64 min-w-0 flex-col items-center justify-center rounded-2xl border border-t-4 border-orange-200 border-t-primary bg-linear-to-br from-amber-50 to-orange-100 px-4 pb-4 pt-12 text-orange-950 shadow-md shadow-orange-950/10 transition-shadow [transform:rotateY(180deg)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] group-hover:shadow-lg group-hover:shadow-orange-950/15 dark:border-orange-900 dark:border-t-primary dark:from-amber-950 dark:to-orange-950 dark:text-orange-50 dark:shadow-black/25"
          >
            <Quote
              aria-hidden="true"
              className="absolute left-5 top-5 size-6 text-primary/40"
            />
            <span className="flex flex-1 items-center max-w-full text-base font-medium leading-7 [overflow-wrap:anywhere]">
              {row.sense.definition}
            </span>
            <span className="pointer-events-auto mt-auto flex min-h-9 shrink-0 flex-wrap items-center justify-center gap-2 pt-4 [&>button]:ml-0">
              {/* Keep the trigger on both sides of a flip; reset only its popup state. */}
              {row.sense.translation?.trim() ? (
                <TranslationPopover
                  key={halfTurns}
                  translation={row.sense.translation}
                />
              ) : null}
              <Button
                type="button"
                size="sm"
                className="border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-200"
                variant="outline"
                disabled={busy}
                onClick={onReviewed}
              >
                {reviewing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Check aria-hidden="true" className="size-4" />
                )}
                Reviewed
              </Button>
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
