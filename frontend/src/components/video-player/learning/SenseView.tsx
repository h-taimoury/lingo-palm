"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Sense } from "@/types/api/dictionary";

type Accent = "British" | "American";

type SenseViewProps = {
  sense: Sense;
  learned: boolean;
  alreadyKnown?: boolean;
};

const SWIPE_DISTANCE = 48;

export function SenseView({ sense, learned, alreadyKnown }: SenseViewProps) {
  return <SenseViewContent key={sense.id} sense={sense} learned={learned} alreadyKnown={alreadyKnown} />;
}

function SenseViewContent({ sense, learned, alreadyKnown }: SenseViewProps) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [playingAccent, setPlayingAccent] = useState<Accent | null>(null);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const pronunciation = sense.entry.pronunciation;
  const examples = sense.examples ?? [];

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  const playPronunciation = useCallback((accent: Accent, url: string | null | undefined) => {
    if (!url) return;

    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setAudioError(false);
    setPlayingAccent(accent);
    audio.addEventListener("ended", () => setPlayingAccent(null), {
      once: true,
    });
    audio.addEventListener(
      "error",
      () => {
        setPlayingAccent(null);
        setAudioError(true);
      },
      { once: true },
    );
    void audio.play().catch(() => {
      setPlayingAccent(null);
      setAudioError(true);
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || target.closest("input, textarea, select, [role='textbox']")
      )) return;

      const key = event.key.toLowerCase();
      if (key !== "a" && key !== "b") return;
      const accent = key === "b" ? "British" : "American";
      const url = key === "b" ? pronunciation?.br_audio : pronunciation?.am_audio;
      if (!url) return;
      event.preventDefault();
      playPronunciation(accent, url);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playPronunciation, pronunciation?.br_audio, pronunciation?.am_audio]);

  function showPreviousExample() {
    setExampleIndex((current) => Math.max(0, current - 1));
  }

  function showNextExample() {
    setExampleIndex((current) => Math.min(examples.length - 1, current + 1));
  }

  function finishSwipe(clientX: number) {
    if (touchStartX.current === null) return;

    const distance = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < SWIPE_DISTANCE) return;
    if (distance < 0) showNextExample();
    else showPreviousExample();
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <div className="min-w-0 leading-relaxed">
          <h3 className="inline text-3xl font-bold tracking-tight text-primary">
            {sense.entry.word}
          </h3>

          {pronunciation?.text ? (
            <span
              className="ml-3 inline-block align-baseline font-[Arial] text-base text-zinc-600 dark:text-zinc-300"
            >
              {pronunciation.text}
            </span>
          ) : null}
          <span className="ml-3 inline-block font-semibold italic text-emerald-700 dark:text-emerald-400">
            {sense.entry.part_of_speech}
          </span>
          <span
            className="ml-2 inline-flex items-center gap-2 align-middle"
            role="group"
            aria-label="Pronunciation audio"
          >
            <PronunciationButton
              accent="British"
              url={pronunciation?.br_audio}
              playing={playingAccent === "British"}
              onPlay={playPronunciation}
            />
            <PronunciationButton
              accent="American"
              url={pronunciation?.am_audio}
              playing={playingAccent === "American"}
              onPlay={playPronunciation}
            />
          </span>
          {learned ? (
            <Badge variant="secondary" className="ml-2">
              {alreadyKnown ? "Already knew" : "Already learned"}
            </Badge>
          ) : null}
        </div>
      </div>

      {audioError ? (
        <p role="status" className="mt-2 text-xs text-destructive">
          The pronunciation audio could not be played.
        </p>
      ) : null}

      <p className="mt-5 text-base leading-7 text-zinc-950 dark:text-zinc-100">
        {sense.sense_number ? (
          <span className="mr-2 font-bold">{sense.sense_number}</span>
        ) : null}

        {sense.lex_unit?.trim() ? (
          <span className="mr-2 font-medium italic text-amber-700 dark:text-amber-300">
            {sense.lex_unit}
          </span>
        ) : null}

        {sense.definition}
      </p>

      {examples.length > 0 ? (
          <div className="mt-5" aria-live="polite">
              <div>
                <div
                  className="min-h-28 touch-pan-y select-none rounded-xl border bg-muted/20 px-5 py-4"
                  onTouchStart={(event) => {
                    touchStartX.current =
                      event.changedTouches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(event) => {
                    const clientX = event.changedTouches[0]?.clientX;
                    if (clientX !== undefined) finishSwipe(clientX);
                  }}
                >
                  {examples[exampleIndex]?.usage ? (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      {examples[exampleIndex].usage}
                    </p>
                  ) : null}
                  <p className="text-base leading-7 text-zinc-500 dark:text-zinc-400">
                    {examples[exampleIndex]?.text}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={exampleIndex === 0}
                    onClick={showPreviousExample}
                    aria-label="Previous example"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {exampleIndex + 1} / {examples.length}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={exampleIndex === examples.length - 1}
                    onClick={showNextExample}
                    aria-label="Next example"
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
                {examples.length > 1 ? (
                  <p className="mt-1 text-center text-xs text-muted-foreground sm:hidden">
                    Swipe to see the next example
                  </p>
                ) : null}
              </div>
          </div>
        ) : null}
    </div>
  );
}

function PronunciationButton({
  accent,
  url,
  playing,
  onPlay,
}: {
  accent: Accent;
  url: string | null | undefined;
  playing: boolean;
  onPlay: (accent: Accent, url: string | null | undefined) => void;
}) {
  const available = Boolean(url);
  const shortcut = accent === "British" ? "B" : "A";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={
        accent === "British"
          ? "cursor-pointer rounded-full p-0 text-[#ff5757] hover:bg-transparent hover:text-[#e84141] dark:hover:bg-transparent"
          : "cursor-pointer rounded-full p-0 text-[#438fe0] hover:bg-transparent hover:text-[#2875c6] dark:hover:bg-transparent"
      }
      disabled={!available}
      aria-keyshortcuts={available ? shortcut : undefined}
      onClick={() => onPlay(accent, url)}
      aria-label={
        available
          ? `Play ${accent} pronunciation`
          : `${accent} pronunciation unavailable`
      }
      title={
        available
          ? `Play ${accent} pronunciation (${shortcut})`
          : `${accent} pronunciation unavailable`
      }
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-6 ${playing ? "animate-pulse" : ""}`}
        aria-hidden="true"
        fill="none"
      >
        <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />
        <path
          d="M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </Button>
  );
}
