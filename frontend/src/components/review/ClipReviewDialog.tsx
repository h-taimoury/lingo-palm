"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { VideoPlayer } from "@/components/video-player/VideoPlayer";
import { apiClient } from "@/lib/api/client";
import { getSectionVideoUrl } from "@/lib/courses/video";
import type { WordSenseMapping } from "@/types/api/courses";
import type { ReviewClipsResponse, Vocabulary } from "@/types/api/vocabulary";

const noMappings: WordSenseMapping[] = [];

export function ClipReviewDialog({ card, onClose }: { card: Vocabulary; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [result, setResult] = useState<ReviewClipsResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    const request = new AbortController();
    void apiClient.get<ReviewClipsResponse>(`/api/my-vocabulary/vocabulary/${card.id}/clips/`, {
      signal: request.signal,
    }).then((data) => {
      if (!request.signal.aborted) setResult(data);
    }).catch((error: unknown) => {
      if (!request.signal.aborted) setError(error);
    });
    return () => request.abort();
  }, [card.id]);

  const clips = result?.available ? result.clips : [];
  const clip = clips[index];
  const subtitle = clip?.section.subtitle_file;
  const subtitleSource = subtitle?.startsWith("/media/")
    ? subtitle.replace("/media/", "/api/backend-media/")
    : subtitle;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      className={`m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-auto rounded-xl border bg-card p-4 text-card-foreground shadow-xl backdrop:bg-black/70 sm:p-6 ${clip ? "max-w-4xl" : "max-w-sm"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-lg font-semibold wrap-anywhere">
          Video examples for {card.sense.entry.word}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close video examples"
          data-player-native-keys="true"
          onClick={() => dialog.current?.close()}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <ApiErrorMessage error={error} />
      {clip ? (
        <VideoPlayer
          source={getSectionVideoUrl(clip.section)}
          subtitleSource={subtitleSource}
          mappings={noMappings}
          title={clip.section.title}
          clip={{
            range: clip,
            position: index + 1,
            count: clips.length,
            onPrevious: index > 0 ? () => setIndex(index - 1) : undefined,
            onNext: index < clips.length - 1 ? () => setIndex(index + 1) : undefined,
          }}
        />
      ) : !error && (
        <p role="status" className="text-sm text-muted-foreground">
          {!result
            ? "Checking for video examples…"
            : result.available
              ? "There are no video examples available for this sense."
              : "Video examples are coming soon."}
        </p>
      )}
    </dialog>
  );
}
