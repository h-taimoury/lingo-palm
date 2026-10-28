"use client"

import { type RefObject, useEffect } from "react"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"
import { findActiveCueIndex } from "@/lib/subtitles"
import type { SubtitleCue } from "@/types/subtitles"

type UseActiveCueOptions = {
  cues: SubtitleCue[]
  videoRef: RefObject<HTMLVideoElement | null>
  subtitleSource?: string | null
}

export function useActiveCue({ cues, videoRef, subtitleSource }: UseActiveCueOptions) {
  const currentTime = usePlayerStore((state) => state.currentTime)
  const activeCueIndex = usePlayerStore((state) => state.activeCueIndex)
  const setActiveCueIndex = usePlayerStore(
    (state) => state.setActiveCueIndex,
  )

  // Temporary A/B test: append ?nativeSubtitles=1 and reload the page.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nativeSubtitles") !== "1") return
    const video = videoRef.current
    if (!video || !subtitleSource) return

    const element = document.createElement("track")
    element.kind = "subtitles"
    element.label = "Native subtitle timing test"
    element.src = subtitleSource
    video.appendChild(element)
    const track = element.track
    track.mode = "hidden"
    const syncCue = () => {
      const active = track.activeCues?.[0]
      setActiveCueIndex(active ? cues.findIndex((cue) =>
        Math.abs(cue.startTime - active.startTime) < 0.001 &&
        Math.abs(cue.endTime - active.endTime) < 0.001,
      ) : -1)
    }
    track.addEventListener("cuechange", syncCue)
    element.addEventListener("load", syncCue)
    video.addEventListener("seeked", syncCue)
    element.onerror = () => console.error("[Native subtitle test] VTT track failed to load", element.src)
    console.info("[Native subtitle test] Hidden track enabled")
    syncCue()
    return () => {
      track.removeEventListener("cuechange", syncCue)
      video.removeEventListener("seeked", syncCue)
      track.mode = "disabled"
      element.remove()
    }
  }, [cues, videoRef, subtitleSource, setActiveCueIndex])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nativeSubtitles") === "1") return
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
