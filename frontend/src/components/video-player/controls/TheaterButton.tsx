"use client"

import { RectangleHorizontal } from "lucide-react"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"

type TheaterButtonProps = {
  onToggle: () => void
}

export function TheaterButton({ onToggle }: TheaterButtonProps) {
  const isTheater = usePlayerStore((state) => state.isTheater)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isTheater}
      className="inline-flex size-9 items-center justify-center rounded-md text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      aria-label={isTheater ? "Exit theater mode" : "Enter theater mode"}
      title={`${isTheater ? "Exit theater mode" : "Enter theater mode"} (T)`}
      aria-keyshortcuts="T"
    >
      <RectangleHorizontal className="size-5" aria-hidden="true" />
    </button>
  )
}
