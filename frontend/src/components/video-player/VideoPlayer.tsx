"use client";

import { PlayerProvider } from "@/components/video-player/PlayerProvider";
import { VideoPlayerInner } from "@/components/video-player/VideoPlayerInner";
import type { WordSenseMapping } from "@/types/api/courses";
import type { PlaybackRange } from "@/types/player";

export type VideoPlayerProps = {
  source: string;
  subtitleSource?: string | null;
  mappings: WordSenseMapping[];
  initialLearnedSenseIds?: number[];
  initialKnownSenseIds?: number[];
  title?: string;
  signInHref?: string;
  clip?: {
    range: PlaybackRange;
    position: number;
    count: number;
    onPrevious?: () => void;
    onNext?: () => void;
  };
};
export function VideoPlayer(props: VideoPlayerProps) {
  return (
    <PlayerProvider>
      <VideoPlayerInner {...props} />
    </PlayerProvider>
  );
}
