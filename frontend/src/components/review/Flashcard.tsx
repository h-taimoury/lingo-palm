"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Quote, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TranslationPopover } from "@/components/video-player/learning/TranslationPopover";
import type { Vocabulary } from "@/types/api/vocabulary";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function Flashcard({
  row,
  actions,
  autoFocus = false,
  onPronunciation,
  onClips,
}: {
  row: Vocabulary;
  actions?: ReactNode;
  autoFocus?: boolean;
  onPronunciation: () => void;
  onClips: () => void;
}) {
  const t = useTranslations();

  const [halfTurns, setHalfTurns] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const definitionRef = useRef<HTMLSpanElement>(null);
  const flipRef = useRef<HTMLButtonElement>(null);
  const definitionId = useId();
  const flipped = halfTurns % 2 === 1;
  const meaningLabel =
    row.sense.sense_number != null
      ? t("Meaning number {0} of word {1} as {2}", { 0: row.sense.sense_number, 1: row.sense.entry.word, 2: row.sense.entry.part_of_speech })
      : t("Vocabulary sense");

  useEffect(() => {
    if (autoFocus) flipRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const definition = definitionRef.current;
    if (!definition || expanded) return;
    const measure = () => setOverflows(definition.scrollHeight > definition.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(definition);
    return () => observer.disconnect();
  }, [row.sense.definition, expanded]);

  function flipCard() {
    setExpanded(false);
    setHalfTurns((value) => value + 1);
    onPronunciation();
  }
  return (
    <div className={`relative w-full max-w-64 ${expanded ? "z-10" : ""}`}>
      <div className="group relative rounded-2xl text-center transition-transform duration-200 [perspective:1200px] motion-safe:hover:-translate-y-1 motion-reduce:transition-none">
        <button
          ref={flipRef}
          type="button"
          onClick={flipCard}
          aria-label={t("{0} for {1}", { 0: flipped ? t("Show sense") : t("Reveal definition"), 1: row.sense.entry.word })}
          aria-pressed={flipped}
          className="peer absolute inset-0 rounded-2xl outline-none"
        />
        <span
          className="pointer-events-none relative grid min-h-64 w-full transition-transform duration-500 ease-in-out [transform-style:preserve-3d] motion-reduce:transition-none peer-focus-visible:[&>span]:shadow-lg"
          style={{ transform: `rotateY(${halfTurns * 180}deg)` }}
        >
          <span
            aria-hidden={flipped}
            inert={flipped}
            className="col-start-1 row-start-1 flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-t-4 border-orange-200 border-t-primary bg-linear-to-br from-orange-50 via-white to-amber-100 px-4 py-6 text-card-foreground shadow-md shadow-orange-950/10 transition-shadow [backface-visibility:hidden] [-webkit-backface-visibility:hidden] group-hover:shadow-lg group-hover:shadow-orange-950/15 dark:border-orange-900 dark:border-t-primary dark:from-orange-950 dark:via-card dark:to-amber-950 dark:shadow-black/25"
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="pointer-events-auto absolute right-2 top-2 text-primary"
              aria-label={t("Watch video examples for {0}", { 0: row.sense.entry.word })}
              aria-haspopup="dialog"
              title={t("Watch video examples")}
              onClick={onClips}
            >
              <Video aria-hidden="true" />
            </Button>
            <span lang="en" dir="ltr" className="max-w-full text-3xl font-bold tracking-tight text-orange-950 [overflow-wrap:anywhere] dark:text-orange-50">
              {row.sense.entry.word}
            </span>
            <span lang="en" dir="ltr" className="mt-4 rounded-lg bg-orange-900/5 px-3 py-1 text-sm font-medium italic text-orange-800 dark:bg-orange-200/10 dark:text-orange-200">
              {row.sense.entry.part_of_speech}
            </span>
            <button
              type="button"
              title={meaningLabel}
              aria-label={meaningLabel}
              onClick={flipCard}
              className="pointer-events-auto mt-2 rounded-full border border-orange-200/80 bg-white/70 px-2.5 py-1 text-xs font-semibold tracking-wide text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-orange-800 dark:bg-orange-950/70 dark:text-orange-200"
            >
              {row.sense.sense_number ?? t("Vocabulary sense")}
            </button>
          </span>
          <span
            aria-hidden={!flipped}
            inert={!flipped}
            className="col-start-1 row-start-1 flex min-h-full min-w-0 flex-col items-center rounded-2xl border border-t-4 border-orange-200 border-t-primary bg-linear-to-br from-amber-50 to-orange-100 px-4 pb-4 pt-12 text-orange-950 shadow-md shadow-orange-950/10 transition-shadow [transform:rotateY(180deg)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] group-hover:shadow-lg group-hover:shadow-orange-950/15 dark:border-orange-900 dark:border-t-primary dark:from-amber-950 dark:to-orange-950 dark:text-orange-50 dark:shadow-black/25"
          >
            <Quote
              aria-hidden="true"
              className="absolute left-5 top-3 size-6 text-primary/40"
            />
            <span
              lang="en"
              dir="ltr"
              ref={definitionRef}
              id={definitionId}
              className={`w-full text-left text-base font-medium leading-6 [overflow-wrap:anywhere] ${expanded ? "block" : "line-clamp-4"}`}
            >
              {row.sense.definition}
            </span>
            {expanded || overflows ? (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={definitionId}
                onClick={() => setExpanded((value) => !value)}
                className="pointer-events-auto mt-2 cursor-pointer rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {expanded ? t("Show less") : t("Show more")}
              </button>
            ) : null}
            <span className="pointer-events-auto mt-auto flex min-h-9 w-full shrink-0 items-center justify-center gap-2 pt-2 [&>button]:ms-0">
              {/* Keep the trigger on both sides of a flip; reset only its popup state. */}
              {row.sense.translation?.trim() ? (
                <TranslationPopover
                  key={halfTurns}
                  translation={row.sense.translation}
                  size={actions ? "xs" : "sm"}
                />
              ) : null}
              {actions ? <span className="ms-auto">{actions}</span> : null}
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
