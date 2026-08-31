"use client"

import { useEffect } from "react"
import Hls from "hls.js"

import { getMediaSourceKind } from "@/components/video-player/core/mediaSource"
import type { PlayerStore } from "@/components/video-player/core/playerStore"

type UseHlsOptions = {
  video: HTMLVideoElement | null
  source: string
  store: PlayerStore
}

export function useHls({ video, source, store }: UseHlsOptions) {
  useEffect(() => {
    if (!video || !source) {
      return
    }

    if (getMediaSourceKind(source) !== "hls") {
      video.src = source
      video.load()
      return
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source
      video.load()
      return
    }

    if (!Hls.isSupported()) {
      store.getState().setError({
        message: "HLS playback is not supported in this browser.",
      })
      store.getState().setStatus("error")
      return
    }

    const hls = new Hls()

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) {
        return
      }

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        store.getState().setError({
          message: "The video stream could not be loaded.",
        })
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        store.getState().setError({
          message: "The browser could not decode this video stream.",
        })
      } else {
        store.getState().setError({
          message: "A fatal HLS playback error occurred.",
        })
      }

      store.getState().setStatus("error")
    })

    hls.loadSource(source)
    hls.attachMedia(video)

    return () => {
      hls.destroy()
      video.removeAttribute("src")
      video.load()
    }
  }, [source, store, video])
}
