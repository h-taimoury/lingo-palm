"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

import { usePlayerStore } from "@/components/video-player/PlayerProvider";
import { FullscreenButton } from "@/components/video-player/controls/FullscreenButton";
import { PlaybackRate } from "@/components/video-player/controls/PlaybackRate";
import { TheaterButton } from "@/components/video-player/controls/TheaterButton";
import { Timeline } from "@/components/video-player/controls/Timeline";
import { VolumeControl } from "@/components/video-player/controls/VolumeControl";

type PlayerControlsProps = {
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleFullscreen: () => void;
  onToggleTheater: () => void;
};

export function PlayerControls({
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onPlaybackRateChange,
  onToggleFullscreen,
  onToggleTheater,
}: PlayerControlsProps) {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isEnded = usePlayerStore((state) => state.isEnded);

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-12 sm:px-4"
      data-player-interactive="true"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <Timeline onSeek={onSeek} />

      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex size-9 items-center justify-center rounded-md text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={isEnded ? "Replay" : isPlaying ? "Pause" : "Play"}
        >
          {isEnded ? (
            <RotateCcw className="size-5" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="size-5" aria-hidden="true" />
          ) : (
            <Play className="size-5" aria-hidden="true" />
          )}
        </button>

        <VolumeControl
          onToggleMute={onToggleMute}
          onVolumeChange={onVolumeChange}
        />

        <div className="flex-1" />

        <PlaybackRate onChange={onPlaybackRateChange} />
        <TheaterButton onToggle={onToggleTheater} />
        <FullscreenButton onToggle={onToggleFullscreen} />
      </div>
    </div>
  );
}
