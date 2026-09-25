"use client";

import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Brain, Check, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SenseNavigation } from "@/components/video-player/learning/SenseNavigation";
import { SenseView } from "@/components/video-player/learning/SenseView";
import { WordDetails } from "@/components/video-player/learning/WordDetails";
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
  presentation = "player",
}: {
  items: LearningItem[];
  activeIndex: number;
  learnedSenseIds: ReadonlySet<number>;
  knownSenseIds: ReadonlySet<number>;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onLearn?: (senseId: number) => void;
  onAlreadyKnown?: (senseId: number) => void;
  presentation?: "player" | "section-vocabulary";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [wordSenseId, setWordSenseId] = useState<number | null>(null);
  const fullWordButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const senseScrollTop = useRef(0);
  const item = items[activeIndex];
  const showingWord = Boolean(item && wordSenseId === item.sense.id);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest("[inert]")) {
      scrollRef.current?.focus({ preventScroll: true });
    }
  }, [activeIndex, item?.sense.id, item?.mappingId]);
  useEffect(() => {
    if (showingWord) backButton.current?.focus({ preventScroll: true });
  }, [showingWord]);
  function backToSense() {
    setWordSenseId(null);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = senseScrollTop.current;
      fullWordButton.current?.focus({ preventScroll: true });
    });
  }
  const isVocabulary = presentation === "section-vocabulary";
  useEffect(() => {
    if (!isVocabulary) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isVocabulary]);
  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    scrollRef.current?.focus({ preventScroll: true });
    return () => previousFocus.current?.focus();
  }, []);
  if (!item) return null;
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (showingWord) event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (showingWord) backToSense();
      else onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? [],
    ).filter((element) => element.getClientRects().length > 0 && !element.closest("[inert]") && getComputedStyle(element).visibility !== "hidden");
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
      className={`${isVocabulary ? "fixed z-50" : "absolute z-40"} inset-0 flex items-center justify-center bg-black/75 p-3 sm:p-6`}
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
        aria-labelledby={isVocabulary || showingWord ? undefined : "learning-modal-title"}
        aria-label={showingWord ? `Full word: ${item.sense.entry.word}` : isVocabulary ? `Details for ${item.sense.entry.word}` : undefined}
        tabIndex={-1}
        onKeyDown={keyDown}
        className="flex max-h-[92%] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background p-1 text-foreground shadow-2xl"
      >
        <div
          ref={scrollRef}
          tabIndex={-1}
          className="min-h-0 overflow-y-auto overscroll-contain p-4 outline-none [scrollbar-color:var(--muted-foreground)_transparent] [scrollbar-width:thin] [scrollbar-gutter:stable] sm:p-5"
        >
          <div className={`${showingWord ? "mb-5" : "mb-2"} flex items-center justify-between gap-4`}>
            {showingWord ? <Button ref={backButton} variant="ghost" size="sm" onClick={backToSense} title="Back to sense (Esc)" aria-keyshortcuts="Escape"><ArrowLeft aria-hidden="true" />Back to sense</Button> : !isVocabulary ? <h2
              id="learning-modal-title"
              className="grid min-w-0 text-xs font-normal leading-5 text-muted-foreground"
            >
              {items.map((labelItem, index) => (
                <span key={`${labelItem.mappingId}-${labelItem.sense.id}-${index}`} className={`col-start-1 row-start-1 transition-none ${index === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`} aria-hidden={index !== activeIndex}>
                  From subtitle: “{labelItem.mappingLabel}”
                </span>
              ))}
            </h2> : null}
            <div className="ml-auto flex shrink-0 items-center gap-8">
              {!showingWord && !isVocabulary && onPrevious && onNext ? <SenseNavigation
                index={activeIndex}
                count={items.length}
                onPrevious={onPrevious}
                onNext={onNext}
              /> : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:hover:bg-accent"
                onClick={onClose}
                aria-label={isVocabulary ? "Close sense details" : "Close learning dialog"}
                title={showingWord ? "Close dialog" : "Close dialog (Esc)"}
                aria-keyshortcuts={showingWord ? undefined : "Escape"}
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>
          {showingWord ? <WordDetails key={item.sense.entry.id} entryId={item.sense.entry.id} currentSenseId={item.sense.id} /> : null}
          <div hidden={showingWord}>
          <div className="grid">
          {items.map((item, index) => {
            const selected = index === activeIndex;
            const learned = learnedSenseIds.has(item.sense.id);
            return (
          <div
            key={`${item.mappingId}-${item.sense.id}-${index}`}
            className={`col-start-1 row-start-1 min-w-0 transition-none ${selected ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            aria-hidden={!selected}
            inert={!selected || showingWord}
          >
          <SenseView
            sense={item.sense}
            learned={learned}
            alreadyKnown={knownSenseIds.has(item.sense.id)}
            examplesMode={isVocabulary ? "all" : "carousel"}
            active={selected && !showingWord}
          />
          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
            <div
              className="mt-4 flex flex-wrap items-center gap-2"
              aria-busy={isSubmitting}
            >
          {!isVocabulary && !learned ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/10 dark:hover:bg-primary/20"
                disabled={isSubmitting}
                onClick={() => onLearn?.(item.sense.id)}
                title="I have learned this meaning."
              >
                <Check aria-hidden="true" />Learned
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => onAlreadyKnown?.(item.sense.id)}
                title="I already knew this meaning."
              >
                <Brain aria-hidden="true" />Already knew
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
            </>
          ) : null}
              <Button
                ref={selected ? fullWordButton : undefined}
                title="View all entries and senses for this word"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  senseScrollTop.current = scrollRef.current?.scrollTop ?? 0;
                  setWordSenseId(item.sense.id);
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }}
              >
                <BookOpen aria-hidden="true" />View full word
              </Button>
            </div>
          </div>
            );
          })}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
