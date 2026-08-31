"use client"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"

type TimelineProps = {
  onSeek: (seconds: number) => void
}

export function Timeline({ onSeek }: TimelineProps) {
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)

  const safeDuration = duration > 0 ? duration : 0

  return (
    <div className="flex items-center gap-3">
      <span className="w-11 text-right text-xs tabular-nums text-white/80">
        {formatTime(currentTime)}
      </span>

      <input
        aria-label="Video progress"
        type="range"
        min={0}
        max={safeDuration || 0}
        step={0.1}
        value={Math.min(currentTime, safeDuration)}
        disabled={safeDuration === 0}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-white disabled:cursor-default"
      />

      <span className="w-11 text-xs tabular-nums text-white/80">
        {formatTime(duration)}
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
