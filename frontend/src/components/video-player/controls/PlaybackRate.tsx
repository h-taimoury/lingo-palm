"use client"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"

type PlaybackRateProps = {
  onChange: (rate: number) => void
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export function PlaybackRate({ onChange }: PlaybackRateProps) {
  const playbackRate = usePlayerStore((state) => state.playbackRate)

  return (
    <label className="hidden items-center gap-2 text-xs text-white/80 sm:flex">
      <span className="sr-only">Playback speed</span>
      <select
        aria-label="Playback speed"
        value={playbackRate}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-md border border-white/20 bg-black/60 px-2 text-sm text-white outline-none focus:ring-2 focus:ring-white"
      >
        {RATES.map((rate) => (
          <option key={rate} value={rate}>
            {rate}×
          </option>
        ))}
      </select>
    </label>
  )
}
