"use client"

import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { usePlayerStore } from "@/components/video-player/PlayerProvider"
import type { PlayerStore } from "@/components/video-player/core/playerStore"
import { useHls } from "@/components/video-player/core/useHls"
import type { PlaybackRange } from "@/types/player"

type UseMediaControllerOptions = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  source: string
  store: PlayerStore
  range?: PlaybackRange
}

export function useMediaController({
  videoRef,
  containerRef,
  source,
  store,
  range,
}: UseMediaControllerOptions) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [expanded, setExpanded] = useState(false)

  const volume = usePlayerStore((state) => state.volume)
  const isMuted = usePlayerStore((state) => state.isMuted)
  const playbackRate = usePlayerStore((state) => state.playbackRate)

  useEffect(() => {
    setVideo(videoRef.current)
  }, [videoRef])

  useHls({ video, source, store, startPosition: range?.start })

  useEffect(() => {
    const media = videoRef.current

    if (!media) {
      return
    }

    const syncPlay = () => {
      store.getState().setPlaying(true)
      store.getState().setEnded(false)
      store.getState().setStatus("ready")
      store.getState().setBuffering(false)
    }

    const syncPause = () => {
      store.getState().setPlaying(false)
    }

    const syncTime = () => {
      if (range && media.readyState >= 1) {
        const end = Math.min(media.duration, range.end)
        const atEnd = media.currentTime >= end
        store.getState().setEnded(atEnd)
        if (atEnd) {
          media.pause()
          if (media.currentTime > end) media.currentTime = end
        }
      }
      store.getState().setCurrentTime(media.currentTime)
    }

    const syncSeeked = () => {
      // The browser may settle at a different time than the requested target.
      // Invalidate the cue cache even if currentTime has not changed.
      syncTime()
      store.getState().setActiveCueIndex(-1)
    }

    const syncDuration = () => {
      store.getState().setDuration(
        Number.isFinite(media.duration) ? media.duration : 0,
      )
    }

    const syncMetadata = () => {
      syncDuration()
      if (!range || !Number.isFinite(media.duration)) return
      media.pause()
      media.currentTime = Math.min(range.start, media.duration)
      store.setState({ currentTime: media.currentTime, activeCueIndex: -1, isEnded: false })
    }

    const syncWaiting = () => {
      store.getState().setBuffering(true)
      store.getState().setStatus("buffering")
    }

    const syncReady = () => {
      store.getState().setBuffering(false)
      store.getState().setStatus("ready")
      store.getState().setError(range && range.start >= media.duration
        ? { message: "This clip starts after the end of the section video." }
        : null)
    }

    const syncVolume = () => {
      store.getState().setVolumeState(media.volume, media.muted)
    }

    const syncRate = () => {
      store.getState().setPlaybackRateState(media.playbackRate)
    }

    const syncEnded = () => {
      store.getState().setEnded(true)
      store.getState().setPlaying(false)
    }

    const syncError = () => {
      const mediaError = media.error

      store.getState().setError({
        code: mediaError?.code,
        message: getMediaErrorMessage(mediaError),
      })
      store.getState().setStatus("error")
      store.getState().setBuffering(false)
    }

    media.addEventListener("play", syncPlay)
    media.addEventListener("pause", syncPause)
    media.addEventListener("timeupdate", syncTime)
    media.addEventListener("seeking", syncTime)
    media.addEventListener("seeked", syncSeeked)
    media.addEventListener("durationchange", syncDuration)
    media.addEventListener("loadedmetadata", syncMetadata)
    media.addEventListener("waiting", syncWaiting)
    media.addEventListener("canplay", syncReady)
    media.addEventListener("playing", syncReady)
    media.addEventListener("volumechange", syncVolume)
    media.addEventListener("ratechange", syncRate)
    media.addEventListener("ended", syncEnded)
    media.addEventListener("error", syncError)

    if (range && media.readyState >= 1) syncMetadata()

    return () => {
      media.removeEventListener("play", syncPlay)
      media.removeEventListener("pause", syncPause)
      media.removeEventListener("timeupdate", syncTime)
      media.removeEventListener("seeking", syncTime)
      media.removeEventListener("seeked", syncSeeked)
      media.removeEventListener("durationchange", syncDuration)
      media.removeEventListener("loadedmetadata", syncMetadata)
      media.removeEventListener("waiting", syncWaiting)
      media.removeEventListener("canplay", syncReady)
      media.removeEventListener("playing", syncReady)
      media.removeEventListener("volumechange", syncVolume)
      media.removeEventListener("ratechange", syncRate)
      media.removeEventListener("ended", syncEnded)
      media.removeEventListener("error", syncError)
    }
  }, [range, source, store, videoRef])

  useEffect(() => {
    const media = videoRef.current
    if (!media) return

    media.volume = volume
    media.muted = isMuted
    media.playbackRate = playbackRate
  }, [isMuted, playbackRate, videoRef, volume])

  useEffect(() => {
    function syncFullscreen() {
      store
        .getState()
        .setFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener("fullscreenchange", syncFullscreen)
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen)
  }, [containerRef, store])

  const play = useCallback(async () => {
    const media = videoRef.current
    if (!media) return

    if (range) {
      if (media.readyState < 1 || range.start >= media.duration) return
      if (media.currentTime < range.start || media.currentTime >= Math.min(media.duration, range.end)) {
        media.currentTime = range.start
      }
    } else if (media.ended) {
      media.currentTime = 0
    }

    try {
      await media.play()
    } catch (error) {
      if (range && error instanceof DOMException && error.name === "AbortError") return
      store.getState().setError({
        message: "Playback could not start. Try pressing play again.",
      })
    }
  }, [range, store, videoRef])

  const pause = useCallback(() => {
    videoRef.current?.pause()
  }, [videoRef])

  const togglePlay = useCallback(() => {
    const media = videoRef.current
    if (!media) return

    if (media.paused || media.ended) {
      void play()
    } else {
      media.pause()
    }
  }, [play, videoRef])

  const seekTo = useCallback(
    (seconds: number) => {
      const media = videoRef.current
      if (!media || !Number.isFinite(seconds)) return

      const duration = Number.isFinite(media.duration)
        ? media.duration
        : Number.POSITIVE_INFINITY

      media.currentTime = Math.min(Math.max(range?.start ?? 0, seconds), range?.end ?? duration, duration)
      store.getState().setCurrentTime(media.currentTime)
    },
    [range, store, videoRef],
  )

  const seekBy = useCallback(
    (seconds: number) => {
      const media = videoRef.current
      if (!media) return
      seekTo(media.currentTime + seconds)
    },
    [seekTo, videoRef],
  )

  const setVolume = useCallback(
    (nextVolume: number) => {
      const media = videoRef.current
      if (!media) return

      media.volume = Math.min(1, Math.max(0, nextVolume))
      if (media.volume > 0 && media.muted) {
        media.muted = false
      }
    },
    [videoRef],
  )

  const adjustVolume = useCallback((amount: number) => {
    const media = videoRef.current
    if (!media) return
    setVolume((media.muted ? 0 : media.volume) + amount)
  }, [setVolume, videoRef])

  const toggleMute = useCallback(() => {
    const media = videoRef.current
    if (!media) return
    media.muted = !media.muted
  }, [videoRef])

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const media = videoRef.current
      if (!media) return
      media.playbackRate = rate
    },
    [videoRef],
  )

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    if (expanded) {
      setExpanded(false)
      store.getState().setFullscreen(false)
    } else if (document.fullscreenElement === container) {
      await document.exitFullscreen()
    } else {
      if (container.requestFullscreen) {
        try {
          await container.requestFullscreen()
          container.focus({ preventScroll: true })
          return
        } catch {
          if (!range) return
        }
      }
      if (!range) return
      setExpanded(true)
      store.getState().setFullscreen(true)
    }
    container.focus({ preventScroll: true })
  }, [containerRef, expanded, range, store])

  useEffect(() => {
    if (!expanded) return
    const dialog = containerRef.current?.closest("dialog")
    const exitExpanded = (event: Event) => {
      event.preventDefault()
      void toggleFullscreen()
    }
    dialog?.addEventListener("cancel", exitExpanded)
    return () => dialog?.removeEventListener("cancel", exitExpanded)
  }, [containerRef, expanded, toggleFullscreen])

  return useMemo(
    () => ({
      play,
      pause,
      togglePlay,
      seekTo,
      seekBy,
      setVolume,
      adjustVolume,
      toggleMute,
      setPlaybackRate,
      toggleFullscreen,
      expanded,
    }),
    [
      pause,
      play,
      seekBy,
      seekTo,
      setPlaybackRate,
      setVolume,
      adjustVolume,
      toggleFullscreen,
      expanded,
      toggleMute,
      togglePlay,
    ],
  )
}

function getMediaErrorMessage(error: MediaError | null) {
  switch (error?.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Video loading was interrupted."
    case MediaError.MEDIA_ERR_NETWORK:
      return "A network error interrupted video playback."
    case MediaError.MEDIA_ERR_DECODE:
      return "The browser could not decode this video."
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "This video source or format is not supported."
    default:
      return "The video could not be played."
  }
}
