"use client"

import { useEffect } from "react"
import Hls from "hls.js"

import { getMediaSourceKind } from "@/components/video-player/core/mediaSource"
import type { PlayerStore } from "@/components/video-player/core/playerStore"
import { attachHlsDiagnostics, hlsDiagnosticOptions } from "./hlsDiagnostics"

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

    store.getState().resetForSource()
    const diagnostics = hlsDiagnosticOptions(typeof window === "undefined" ? "" : window.location.search)
    const isHls = getMediaSourceKind(source) === "hls"
    const forceJs = diagnostics.forceJs && Hls.isSupported()
    let stopDiagnostics: (() => void) | undefined

    const clearSource = () => {
      stopDiagnostics?.()
      video.pause()
      video.removeAttribute("src")
      video.load()
    }

    if (
      !isHls ||
      (!forceJs && video.canPlayType("application/vnd.apple.mpegurl"))
    ) {
      if (diagnostics.enabled) stopDiagnostics = attachHlsDiagnostics(video, store, isHls ? "native-hls" : "progressive")
      video.setAttribute("src", source)
      video.load()
      return clearSource
    }

    if (!Hls.isSupported()) {
      store.getState().setError({
        message: "HLS playback is not supported in this browser.",
      })
      store.getState().setStatus("error")
      return
    }

    const hls = new Hls()
    if (diagnostics.enabled) stopDiagnostics = attachHlsDiagnostics(video, store, "hls.js", hls)

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
      clearSource()
    }
  }, [source, store, video])
}
