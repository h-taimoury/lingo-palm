"use client";

import { useState } from "react";
import { Clock3, LayoutGrid } from "lucide-react";
import { FlashcardDeck } from "@/components/review/FlashcardDeck";
import { ReviewSession } from "@/components/review/ReviewSession";
import type { PaginatedResponse } from "@/types/api/common";
import type { ReviewAnswerResponse, ReviewBatch, Vocabulary } from "@/types/api/vocabulary";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function ReviewContent({ initialBatch, initialVocabulary }: {
  initialBatch: ReviewBatch;
  initialVocabulary: PaginatedResponse<Vocabulary>;
}) {
  const t = useTranslations();

  const [reviewUpdates, setReviewUpdates] = useState<Record<number, ReviewAnswerResponse>>({});
  const [stoppedIds, setStoppedIds] = useState<number[]>([]);

  return (
    <>
      <section aria-labelledby="due-review-heading" className="mt-10">
        <div className="mb-8 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="due-review-heading" className="text-xl font-semibold tracking-tight">{t("Due for review")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("Work through the senses that are ready to review now. Flip a card if needed, then choose Remembered or Forgot. Use the arrows to revisit cards or leave one unanswered.")}</p>
          </div>
        </div>
        <ReviewSession
          initialData={initialBatch}
          stoppedIds={stoppedIds}
          onReviewSaved={(id, review) => setReviewUpdates((current) => ({ ...current, [id]: review }))}
        />
      </section>
      <section aria-labelledby="all-review-heading" className="mt-16 border-t pt-12 sm:mt-20 sm:pt-16">
        <div className="mb-8 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <LayoutGrid aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="all-review-heading" className="text-xl font-semibold tracking-tight">{t("All review senses")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("Browse every sense in your review schedule, including those due later. Check meanings, see the next review time, or stop reviewing a sense.")}</p>
          </div>
        </div>
        <FlashcardDeck
          initialData={initialVocabulary}
          reviewUpdates={reviewUpdates}
          onStopReviewing={(id) => setStoppedIds((current) => [...current, id])}
        />
      </section>
    </>
  );
}
