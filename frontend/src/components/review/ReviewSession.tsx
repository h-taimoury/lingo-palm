"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, LoaderCircle } from "lucide-react";
import { Flashcard } from "@/components/review/Flashcard";
import { ReviewDueTime } from "@/components/review/ReviewDueTime";
import { useReviewMedia } from "@/components/review/useReviewMedia";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type {
  ReviewAnswerRequest, ReviewAnswerResponse, ReviewBatch, ReviewRating,
} from "@/types/api/vocabulary";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function ReviewSession({ initialData, stoppedIds = [], onReviewSaved }: {
  initialData: ReviewBatch;
  stoppedIds?: number[];
  onReviewSaved?: (vocabularyId: number, review: ReviewAnswerResponse) => void;
}) {
  const t = useTranslations();

  const [batch, setBatch] = useState(initialData);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ReviewAnswerResponse>>({});
  const [busy, setBusy] = useState(false);
  const [cardMotion, setCardMotion] = useState<"out" | "in" | null>(null);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [pendingAnswer, setPendingAnswer] = useState<ReviewAnswerRequest | null>(null);
  const [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const advancing = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const row = batch.results[index];
  const { playPronunciation, openClips, media } = useReviewMedia(row?.id);
  const finished = !row;
  const conflict = error instanceof ApiError && [404, 409].includes(error.status ?? 0);
  const transitioning = cardMotion !== null;
  const selectedRating = row ? answers[row.id]?.rating : undefined;
  const stopped = row ? stoppedIds.includes(row.id) : false;
  const navigationDisabled = busy || pendingAnswer !== null || transitioning;
  const remembered = Object.values(answers).filter((answer) => answer.rating === 3).length;
  const forgot = Object.values(answers).filter((answer) => answer.rating === 1).length;
  const skipped = batch.results.length - remembered - forgot;
  const nextDue = Object.values(answers).filter((answer) => answer.rating !== null).reduce(
    (earliest, answer) => !earliest || Date.parse(answer.due_at) < Date.parse(earliest)
      ? answer.due_at : earliest,
    batch.next_due_at,
  );

  useEffect(() => () => clearTimeout(transitionTimer.current), []);
  useEffect(() => {
    if (finished) summaryRef.current?.focus({ preventScroll: true });
  }, [finished]);

  function moveCard(step: -1 | 1) {
    const target = index + step;
    if (advancing.current || target < 0 || target > batch.results.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIndex(target);
      return;
    }
    advancing.current = true;
    setDirection(step);
    setCardMotion("out");
    transitionTimer.current = setTimeout(() => {
      setIndex(target);
      if (target < batch.results.length) {
        setCardMotion("in");
        transitionTimer.current = setTimeout(() => {
          setCardMotion(null);
          advancing.current = false;
        }, 200);
      } else {
        setCardMotion(null);
        advancing.current = false;
      }
    }, 200);
  }

  async function loadBatch() {
    if (submitting.current || advancing.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const data = await apiClient.get<ReviewBatch>("/api/my-vocabulary/vocabulary/review-batch/");
      setBatch(data);
      setIndex(0);
      setAnswers({});
      setPendingAnswer(null);
    } catch (caught) {
      setError(caught);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function saveAnswer(rating?: ReviewRating | null) {
    if (!row || submitting.current || advancing.current || (stopped && !pendingAnswer)) return;
    if (!pendingAnswer && rating === undefined) return;
    const review = answers[row.id];
    const answer: ReviewAnswerRequest = pendingAnswer ?? {
      submission_id: crypto.randomUUID(),
      rating: rating ?? null,
      version: review?.version ?? row.review_version,
      ...(review ? { review_id: review.id } : {}),
    };
    submitting.current = true;
    setPendingAnswer(answer);
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.post<ReviewAnswerResponse, ReviewAnswerRequest>(
        `/api/my-vocabulary/vocabulary/${row.id}/review/`, answer,
      );
      setAnswers((current) => ({ ...current, [row.id]: result }));
      onReviewSaved?.(row.id, result);
      if (answer.review_id === undefined) moveCard(1);
      setPendingAnswer(null);
    } catch (caught) {
      setError(caught);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const navigation = (
    <div role="group" aria-label={t("Review navigation")} className="flex h-12 w-full items-center justify-between gap-1 rounded-xl border border-border bg-secondary/40 px-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("Previous card")}
        title={t("Previous card")}
        className="size-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        disabled={navigationDisabled || index === 0}
        onClick={() => {
          if (!submitting.current && !pendingAnswer) moveCard(-1);
        }}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Button>
      <span aria-live="polite" aria-atomic="true" className="whitespace-nowrap text-xs font-medium tabular-nums text-muted-foreground">
        {t("{0} of {1}", { 0: Math.min(index + 1, batch.results.length), 1: batch.results.length })}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("Next card")}
        title={index === batch.results.length - 1 ? t("Finish batch") : t("Next card")}
        className="size-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        disabled={navigationDisabled || finished}
        onClick={() => {
          if (!submitting.current && !pendingAnswer) moveCard(1);
        }}
      >
        <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Button>
    </div>
  );

  return (
    <div aria-busy={busy || transitioning} className="mx-auto max-w-xl">
      {media}
      <ApiErrorMessage error={error} />
      {error ? (
        <div className="my-4 flex flex-wrap justify-center gap-3">
          {pendingAnswer && !conflict ? <Button disabled={busy || transitioning} onClick={() => void saveAnswer()}>
            {t("Retry saving answer")}</Button> : null}
          <Button variant="outline" disabled={busy || transitioning} onClick={() => void loadBatch()}>
            {row ? t("Load a new batch") : t("Check for due senses")}
          </Button>
        </div>
      ) : null}
      {row ? (
        <>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="w-full max-w-64">
              <div className="-m-4 overflow-hidden p-4">
                <div
                  key={`${row.id}-${row.review_version}`}
                  inert={transitioning}
                  className={cn(
                    "motion-safe:duration-200 motion-safe:fill-mode-both",
                    cardMotion === "out" && "motion-safe:animate-out motion-safe:fade-out motion-safe:ease-in",
                    cardMotion === "in" && "motion-safe:animate-in motion-safe:fade-in motion-safe:ease-out",
                    cardMotion === "out" && (direction === 1
                      ? "motion-safe:slide-out-to-left-16" : "motion-safe:slide-out-to-right-16"),
                    cardMotion === "in" && (direction === 1
                      ? "motion-safe:slide-in-from-right-16" : "motion-safe:slide-in-from-left-16"),
                  )}
                >
                  <Flashcard
                    row={row}
                    autoFocus={!transitioning}
                    onPronunciation={() => playPronunciation(row)}
                    onClips={() => openClips(row)}
                  />
                </div>
              </div>
            </div>
            <div role="group" aria-label={t("Review actions")} className="grid w-max shrink-0 gap-3">
              <Button
                type="button"
                aria-pressed={selectedRating === 3}
                className={cn(
                  "h-12 justify-start gap-3 rounded-xl border-2 bg-primary/10 px-4 text-primary hover:bg-primary/15",
                  selectedRating === 3 ? "border-primary" : "border-transparent",
                )}
                disabled={navigationDisabled || stopped}
                onClick={() => void saveAnswer(selectedRating === 3 ? null : 3)}
              >
                <Check aria-hidden="true" className="size-5" />
                {t("Remembered")}</Button>
              <Button
                type="button"
                variant="ghost"
                aria-pressed={selectedRating === 1}
                className={cn(
                  "h-12 justify-start gap-3 rounded-xl border-2 bg-zinc-600/10 px-4 text-zinc-800 hover:bg-zinc-600/15 focus-visible:border-zinc-700 focus-visible:ring-zinc-600/30 dark:bg-zinc-300/10 dark:text-zinc-200 dark:hover:bg-zinc-300/15 dark:focus-visible:border-zinc-300 dark:focus-visible:ring-zinc-300/30",
                  selectedRating === 1 ? "border-zinc-700 dark:border-zinc-300" : "border-transparent",
                )}
                disabled={navigationDisabled || stopped}
                onClick={() => void saveAnswer(selectedRating === 1 ? null : 1)}
              >
                <CircleHelp aria-hidden="true" className="size-5" />
                {t("Forgot")}</Button>
              {navigation}
            </div>
          </div>
          {stopped ? <p role="status" className="mt-4 text-center text-sm text-muted-foreground">
            {t("This sense is no longer in your review schedule.")} {pendingAnswer
              ? t("Load a new batch to continue.") : t("Use the next arrow to continue.")}
          </p> : selectedRating != null ? <p role="status" className="mt-4 text-center text-sm text-muted-foreground">
            {t("Your answer is saved.")}</p> : null}
          {busy ? <p role="status" className="mt-3 text-center text-sm text-muted-foreground">
            {t("Saving your answer…")}</p> : null}
        </>
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center">
          <h2 ref={summaryRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            {batch.results.length ? t("Batch complete") : t("No senses are due")}
          </h2>
          {batch.results.length ? <p className="mt-3 text-muted-foreground">
            {t("{0} remembered · {1} forgot · {2} skipped", { 0: remembered, 1: forgot, 2: skipped })}</p> : null}
          {nextDue ? <p className="mt-3 text-sm text-muted-foreground">
            {t("Next scheduled review ·")} <ReviewDueTime value={nextDue} />
          </p> : null}
          {batch.results.length ? <div className="mx-auto mt-6 w-36">{navigation}</div> : null}
          <Button className="mt-6" disabled={busy || transitioning} onClick={() => void loadBatch()}>
            {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            {batch.results.length ? t("Continue reviewing") : t("Check for due senses")}
          </Button>
        </div>
      )}
    </div>
  );
}
