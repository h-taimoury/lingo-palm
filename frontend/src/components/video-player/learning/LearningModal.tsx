"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SenseNavigation } from "@/components/video-player/learning/SenseNavigation";
import { SenseView } from "@/components/video-player/learning/SenseView";
import type { LearningItem } from "@/components/video-player/learning/learningItems";

export function LearningModal({
  items,
  activeIndex,
  learnedSenseIds,
  knownSenseIds,
  isSubmitting,
  error,
  onClose,
  onPrevious,
  onNext,
  onLearn,
  onAlreadyKnown,
}: {
  items: LearningItem[];
  activeIndex: number;
  learnedSenseIds: ReadonlySet<number>;
  knownSenseIds: ReadonlySet<number>;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLearn: (senseId: number) => void;
  onAlreadyKnown: (senseId: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const item = items[activeIndex];
  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    scrollRef.current?.focus({ preventScroll: true });
    return () => previousFocus.current?.focus();
  }, []);
  if (!item) return null;
  const learned = learnedSenseIds.has(item.sense.id);
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? [],
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0],
      last = focusable.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === scrollRef.current)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6"
      data-player-interactive="true"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-modal-title"
        tabIndex={-1}
        onKeyDown={keyDown}
        className="flex max-h-[92%] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background p-1 text-foreground shadow-2xl"
      >
        <div
          ref={scrollRef}
          tabIndex={-1}
          className="min-h-0 overflow-y-auto overscroll-contain p-4 outline-none [scrollbar-color:var(--muted-foreground)_transparent] [scrollbar-width:thin] [scrollbar-gutter:stable] sm:p-5"
        >
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2
              id="learning-modal-title"
              className="min-w-0 text-xs font-normal leading-5 text-muted-foreground"
            >
              From subtitle: “{item.mappingLabel}”
            </h2>
            <div className="flex shrink-0 items-center gap-8">
              <SenseNavigation
                index={activeIndex}
                count={items.length}
                onPrevious={onPrevious}
                onNext={onNext}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:hover:bg-accent"
                onClick={onClose}
                aria-label="Close learning dialog"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>
          <SenseView
            sense={item.sense}
            learned={learned}
            alreadyKnown={knownSenseIds.has(item.sense.id)}
          />
          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {!learned ? (
            <div
              className="mt-4 flex flex-wrap items-center gap-2"
              aria-busy={isSubmitting}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/10 dark:hover:bg-primary/20"
                disabled={isSubmitting}
                onClick={() => onLearn(item.sense.id)}
                title="I have learned this meaning."
              >
                Learned
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => onAlreadyKnown(item.sense.id)}
                title="I already knew this meaning."
              >
                Already knew
              </Button>
              {isSubmitting ? (
                <span
                  role="status"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <LoaderCircle
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Saving…
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
