"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, RotateCcw } from "lucide-react";
import { Flashcard } from "@/components/review/Flashcard";
import { ReviewDueTime } from "@/components/review/ReviewDueTime";
import { useReviewMedia } from "@/components/review/useReviewMedia";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  ReviewAnswerRequest, ReviewAnswerResponse, ReviewBatch, ReviewRating,
} from "@/types/api/vocabulary";

export function ReviewSession({ initialData }: { initialData: ReviewBatch }) {
  const [batch, setBatch] = useState(initialData);
  const [index, setIndex] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [forgot, setForgot] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [nextDue, setNextDue] = useState(initialData.next_due_at);
  const [busy, setBusy] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<ReviewAnswerRequest | null>(null);
  const [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const row = batch.results[index];
  const { playPronunciation, openClips, media } = useReviewMedia(row?.id);
  const finished = !row;
  const conflict = error instanceof ApiError && [404, 409].includes(error.status ?? 0);

  useEffect(() => {
    if (finished) summaryRef.current?.focus({ preventScroll: true });
  }, [finished]);

  async function loadBatch() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const data = await apiClient.get<ReviewBatch>("/api/my-vocabulary/vocabulary/review-batch/");
      setBatch(data);
      setIndex(0);
      setRemembered(0);
      setForgot(0);
      setSkipped(0);
      setPendingAnswer(null);
      setNextDue(data.next_due_at);
    } catch (caught) {
      setError(caught);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function saveAnswer(rating?: ReviewRating) {
    if (!row || submitting.current) return;
    if (!pendingAnswer && rating === undefined) return;
    const answer = pendingAnswer ?? {
      submission_id: crypto.randomUUID(),
      rating: rating!,
      version: row.review_version,
    };
    submitting.current = true;
    setPendingAnswer(answer);
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.post<ReviewAnswerResponse, ReviewAnswerRequest>(
        `/api/my-vocabulary/vocabulary/${row.id}/review/`, answer,
      );
      if (answer.rating === 3) setRemembered((count) => count + 1);
      else setForgot((count) => count + 1);
      setNextDue((current) => !current || Date.parse(result.due_at) < Date.parse(current)
        ? result.due_at : current);
      setIndex((current) => current + 1);
      setPendingAnswer(null);
    } catch (caught) {
      setError(caught);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div aria-busy={busy} className="mx-auto max-w-xl">
      {media}
      <ApiErrorMessage error={error} />
      {error ? (
        <div className="my-4 flex flex-wrap justify-center gap-3">
          {pendingAnswer && !conflict ? <Button disabled={busy} onClick={() => void saveAnswer()}>
            Retry saving answer
          </Button> : null}
          <Button variant="outline" disabled={busy} onClick={() => void loadBatch()}>
            {row ? "Load a new batch" : "Check for due senses"}
          </Button>
        </div>
      ) : null}
      {row ? (
        <>
          <p aria-live="polite" className="mb-6 text-center text-sm text-muted-foreground">
            Card {index + 1} of {batch.results.length}
          </p>
          <div className="flex justify-center">
            <Flashcard
              key={`${row.id}-${row.review_version}`}
              row={row}
              autoFocus
              onPronunciation={() => playPronunciation(row)}
              onClips={() => openClips(row)}
              actions={<>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || pendingAnswer !== null}
                  onClick={() => void saveAnswer(1)}
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Forgot
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || pendingAnswer !== null}
                  onClick={() => void saveAnswer(3)}
                >
                  <Check aria-hidden="true" className="size-4" />
                  Remembered
                </Button>
              </>}
            />
          </div>
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              disabled={busy || pendingAnswer !== null}
              onClick={() => {
                setSkipped((count) => count + 1);
                setIndex((current) => current + 1);
              }}
            >
              Skip for now
            </Button>
          </div>
          {busy ? <p role="status" className="mt-3 text-center text-sm text-muted-foreground">
            Saving your answer…
          </p> : null}
        </>
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center">
          <h2 ref={summaryRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            {batch.results.length ? "Batch complete" : "No senses are due"}
          </h2>
          {batch.results.length ? <p className="mt-3 text-muted-foreground">
            {remembered} remembered · {forgot} forgot · {skipped} skipped
          </p> : null}
          {nextDue ? <p className="mt-3 text-sm text-muted-foreground">
            Next scheduled review · <ReviewDueTime value={nextDue} />
          </p> : null}
          <Button className="mt-6" disabled={busy} onClick={() => void loadBatch()}>
            {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            {batch.results.length ? "Continue reviewing" : "Check for due senses"}
          </Button>
        </div>
      )}
    </div>
  );
}
