import Hls, { type FragLoadingData, type FragBufferedData, type FragChangedData } from "hls.js"
import type { PlayerStore } from "./playerStore"

// Opt-in per page load. Never log signed URLs, manifest bodies, or request headers.
export function hlsDiagnosticOptions(search: string) {
  const params = new URLSearchParams(search)
  const enabled = params.get("hlsDebug") === "1"
  return { enabled, forceJs: enabled && params.get("hlsEngine") === "js" }
}

export function attachHlsDiagnostics(
  video: HTMLVideoElement, store: PlayerStore, engine: string, hls?: Hls,
) {
  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.info("[LingoPalm media]", {
      event, engine, hlsVersion: Hls.version,
      currentTime: video.currentTime, storeTime: store.getState().currentTime,
      activeCueIndex: store.getState().activeCueIndex,
      seeking: video.seeking, paused: video.paused, readyState: video.readyState,
      buffered: Array.from({ length: video.buffered.length }, (_, i) => [video.buffered.start(i), video.buffered.end(i)]),
      ...extra,
    })
  }
  let frame: number | undefined
  const mediaEvents = ["loadedmetadata", "seeking", "seeked", "playing", "waiting", "error"]
  const onMedia = (event: Event) => {
    log(event.type)
    if (event.type === "seeked" && video.requestVideoFrameCallback) {
      if (frame !== undefined) video.cancelVideoFrameCallback(frame)
      frame = video.requestVideoFrameCallback((_now, metadata) => {
        frame = undefined
        log("frame-after-seek", { frameMediaTime: metadata.mediaTime })
      })
    }
  }
  mediaEvents.forEach((event) => video.addEventListener(event, onMedia))
  log("engine-selected")

  if (hls) {
    // Register before loading. Copy scalar values so later hls.js mutations
    // cannot rewrite the diagnostic evidence shown in the browser console.
    for (const event of [Hls.Events.FRAG_LOADING, Hls.Events.FRAG_BUFFERED, Hls.Events.FRAG_CHANGED] as const) {
      hls.on(event, (_event: string, { frag }: FragLoadingData | FragBufferedData | FragChangedData) => log(event, {
        sn: frag.sn, level: frag.level, cc: frag.cc, type: frag.type,
        start: frag.start, duration: frag.duration,
        startPTS: frag.startPTS, endPTS: frag.endPTS, startDTS: frag.startDTS,
        audioStartPTS: frag.elementaryStreams.audio?.startPTS,
        videoStartPTS: frag.elementaryStreams.video?.startPTS,
      }))
    }
    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => log("level-switched", { level: data.level }))
    hls.on(Hls.Events.LEVEL_PTS_UPDATED, (_event, data) => log("level-pts-updated", {
      level: data.level, drift: data.drift, type: data.type,
      start: data.start, end: data.end,
    }))
    hls.on(Hls.Events.ERROR, (_event, data) => log("hls-error", {
      type: data.type, details: data.details, fatal: data.fatal,
    }))
  }
  return () => {
    mediaEvents.forEach((event) => video.removeEventListener(event, onMedia))
    if (frame !== undefined) video.cancelVideoFrameCallback(frame)
    // The owning useHls effect destroys hls and its listeners on cleanup.
  }
}
