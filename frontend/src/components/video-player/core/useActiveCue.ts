"use client"

import { useEffect } from "react"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"
import { findActiveCueIndex } from "@/lib/subtitles"
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
    if (cues.length === 0) {
      if (activeCueIndex !== -1) {
        setActiveCueIndex(-1)
      }
      return
    }

    const currentCue = cues[activeCueIndex]

    if (
      currentCue &&
      currentTime >= currentCue.startTime &&
      currentTime < currentCue.endTime
    ) {
      return
    }

    const nextCue = cues[activeCueIndex + 1]

    if (
      nextCue &&
      currentTime >= nextCue.startTime &&
      currentTime < nextCue.endTime
    ) {
      setActiveCueIndex(activeCueIndex + 1)
      return
    }

    const nextIndex = findActiveCueIndex(cues, currentTime)

    if (nextIndex !== activeCueIndex) {
      setActiveCueIndex(nextIndex)
    }
  }, [
    activeCueIndex,
    cues,
    currentTime,
    setActiveCueIndex,
  ])
}
