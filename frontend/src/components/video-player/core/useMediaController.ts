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

type UseMediaControllerOptions = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  source: string
  store: PlayerStore
}

export function useMediaController({
  videoRef,
  containerRef,
  source,
  store,
}: UseMediaControllerOptions) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)

  const volume = usePlayerStore((state) => state.volume)
  const isMuted = usePlayerStore((state) => state.isMuted)
  const playbackRate = usePlayerStore((state) => state.playbackRate)

  useEffect(() => {
    setVideo(videoRef.current)
  }, [videoRef])

  useHls({ video, source, store })

  useEffect(() => {
    const media = videoRef.current

    if (!media) {
      return
    }

    store.getState().resetForSource()

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
      store.getState().setCurrentTime(media.currentTime)
    }

    const syncDuration = () => {
      store.getState().setDuration(
        Number.isFinite(media.duration) ? media.duration : 0,
      )
    }

    const syncWaiting = () => {
      store.getState().setBuffering(true)
      store.getState().setStatus("buffering")
    }

    const syncReady = () => {
      store.getState().setBuffering(false)
      store.getState().setStatus("ready")
      store.getState().setError(null)
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
    media.addEventListener("durationchange", syncDuration)
    media.addEventListener("loadedmetadata", syncDuration)
    media.addEventListener("waiting", syncWaiting)
    media.addEventListener("canplay", syncReady)
    media.addEventListener("playing", syncReady)
    media.addEventListener("volumechange", syncVolume)
    media.addEventListener("ratechange", syncRate)
    media.addEventListener("ended", syncEnded)
    media.addEventListener("error", syncError)

    return () => {
      media.removeEventListener("play", syncPlay)
      media.removeEventListener("pause", syncPause)
      media.removeEventListener("timeupdate", syncTime)
      media.removeEventListener("durationchange", syncDuration)
      media.removeEventListener("loadedmetadata", syncDuration)
      media.removeEventListener("waiting", syncWaiting)
      media.removeEventListener("canplay", syncReady)
      media.removeEventListener("playing", syncReady)
      media.removeEventListener("volumechange", syncVolume)
      media.removeEventListener("ratechange", syncRate)
      media.removeEventListener("ended", syncEnded)
      media.removeEventListener("error", syncError)
    }
  }, [source, store, videoRef])

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

    if (media.ended) {
      media.currentTime = 0
    }

    try {
      await media.play()
    } catch {
      store.getState().setError({
        message: "Playback could not start. Try pressing play again.",
      })
    }
  }, [store, videoRef])

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

      media.currentTime = Math.min(Math.max(0, seconds), duration)
      store.getState().setCurrentTime(media.currentTime)
    },
    [store, videoRef],
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

    if (document.fullscreenElement === container) {
      await document.exitFullscreen()
    } else {
      await container.requestFullscreen()
    }
  }, [containerRef])

  return useMemo(
    () => ({
      play,
      pause,
      togglePlay,
      seekTo,
      seekBy,
      setVolume,
      toggleMute,
      setPlaybackRate,
      toggleFullscreen,
    }),
    [
      pause,
      play,
      seekBy,
      seekTo,
      setPlaybackRate,
      setVolume,
      toggleFullscreen,
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
