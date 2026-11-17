"use client"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"
import type { PlaybackRange } from "@/types/player"

type TimelineProps = {
  onSeek: (seconds: number) => void
  range?: PlaybackRange
}

export function Timeline({ onSeek, range }: TimelineProps) {
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)

  const start = range?.start ?? 0
  const safeDuration = Math.max(0, Math.min(duration, range?.end ?? duration) - start)
  const elapsed = Math.min(Math.max(0, currentTime - start), safeDuration)

  return (
    <div className="flex items-center gap-3">
      <span className="w-11 text-right text-xs tabular-nums text-white/80">
        {formatTime(elapsed)}
      </span>

      <input
        aria-label="Video progress"
        type="range"
        min={0}
        max={safeDuration}
        step={0.1}
        value={elapsed}
        disabled={safeDuration === 0}
        onChange={(event) => onSeek(start + Number(event.target.value))}
        // Release pointer focus so Enter can open the current subtitle's senses.
        // Keyboard users can still Tab here and seek with the arrow keys.
        onPointerUp={(event) => event.currentTarget.blur()}
        onPointerCancel={(event) => event.currentTarget.blur()}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-white disabled:cursor-default"
      />

      <span className="w-11 text-xs tabular-nums text-white/80">
        {formatTime(safeDuration)}
      </span>
    </div>
  )
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00"
  }

  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`
}
