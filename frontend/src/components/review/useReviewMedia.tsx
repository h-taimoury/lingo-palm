"use client";

import { useEffect, useRef, useState } from "react";
import { ClipReviewDialog } from "@/components/review/ClipReviewDialog";
import type { Vocabulary } from "@/types/api/vocabulary";

export function useReviewMedia(activeCardOrPage?: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [clipCard, setClipCard] = useState<Vocabulary | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, [activeCardOrPage]);

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

  function openClips(row: Vocabulary) {
    audioRef.current?.pause();
    audioRef.current = null;
    setClipCard(row);
  }

  return {
    playPronunciation,
    openClips,
    media: <>
      {audioError ? <p role="status" className="mb-4 text-sm text-destructive">
        The American pronunciation audio could not be played.
      </p> : null}
      {clipCard ? <ClipReviewDialog card={clipCard} onClose={() => setClipCard(null)} /> : null}
    </>,
  };
}
