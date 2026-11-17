"use client"

import { useEffect } from "react"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"
import type { SubtitleCue } from "@/types/subtitles"

type UseActiveCueOptions = {
  cues: SubtitleCue[]
}

export function useActiveCue({ cues }: UseActiveCueOptions) {
  const currentTime = usePlayerStore((state) => state.currentTime)
  const activeCueIndex = usePlayerStore((state) => state.activeCueIndex)
  const setActiveCueIndex = usePlayerStore(
    (state) => state.setActiveCueIndex,
  )

  useEffect(() => {
    // Cues can overlap. Pick the last active cue in file order even after a seek.
    let index = cues.length - 1
    while (index >= 0) {
      const cue = cues[index]
      if (cue.startTime <= currentTime && currentTime < cue.endTime) break
      index -= 1
    }
    if (index !== activeCueIndex) setActiveCueIndex(index)
  }, [
    activeCueIndex,
    cues,
    currentTime,
    setActiveCueIndex,
  ])
}
