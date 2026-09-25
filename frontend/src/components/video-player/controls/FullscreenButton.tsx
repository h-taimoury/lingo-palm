"use client"

import { Maximize, Minimize } from "lucide-react"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"

type FullscreenButtonProps = {
  onToggle: () => void
}

export function FullscreenButton({ onToggle }: FullscreenButtonProps) {
  const isFullscreen = usePlayerStore((state) => state.isFullscreen)

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex size-9 items-center justify-center rounded-md text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={`${isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} (F)`}
      aria-keyshortcuts="F"
    >
      {isFullscreen ? (
        <Minimize className="size-5" aria-hidden="true" />
      ) : (
        <Maximize className="size-5" aria-hidden="true" />
      )}
    </button>
  )
}
