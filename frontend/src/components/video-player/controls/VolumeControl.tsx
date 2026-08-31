"use client"

import { Volume2, VolumeX } from "lucide-react"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"

type VolumeControlProps = {
  onToggleMute: () => void
  onVolumeChange: (value: number) => void
}

export function VolumeControl({
  onToggleMute,
  onVolumeChange,
}: VolumeControlProps) {
  const volume = usePlayerStore((state) => state.volume)
  const isMuted = usePlayerStore((state) => state.isMuted)

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onToggleMute}
        className="inline-flex size-9 items-center justify-center rounded-md text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="size-5" aria-hidden="true" />
        ) : (
          <Volume2 className="size-5" aria-hidden="true" />
        )}
      </button>

      <input
        aria-label="Volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={isMuted ? 0 : volume}
        onChange={(event) => onVolumeChange(Number(event.target.value))}
        className="hidden w-20 cursor-pointer accent-white sm:block"
      />
    </div>
  )
}
