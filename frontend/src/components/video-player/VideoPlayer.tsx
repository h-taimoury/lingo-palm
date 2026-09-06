"use client";

import { PlayerProvider } from "@/components/video-player/PlayerProvider";
import { VideoPlayerInner } from "@/components/video-player/VideoPlayerInner";
import type { WordSenseMapping } from "@/types/api/courses";

export type VideoPlayerProps = {
  source: string;
  subtitleSource?: string | null;
  mappings: WordSenseMapping[];
  initialLearnedSenseIds?: number[];
  title?: string;
};
export function VideoPlayer(props: VideoPlayerProps) {
  return (
    <PlayerProvider>
      <VideoPlayerInner {...props} />
    </PlayerProvider>
  );
}
