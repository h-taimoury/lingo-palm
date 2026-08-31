"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"

import { mappingColor } from "@/components/admin/mappings/mappingStyles"
import { getMediaSourceKind } from "@/components/video-player/core/mediaSource"
import { findActiveCueIndex } from "@/lib/subtitles/findActiveCue"
import { cn } from "@/lib/utils"
import type { WordSenseMapping } from "@/types/api/courses"
import type { SubtitleCue, SubtitleMappingIndex, SubtitleToken } from "@/types/subtitles"

export type AdminVideoPreviewProps = {
  source: string
  cues: SubtitleCue[]
  mappingIndex: SubtitleMappingIndex
  selectedKeys: Set<string>
  activeMappingId: number | null
  onTokenClick: (token: SubtitleToken) => void
  onMappedTokenClick?: (mapping: WordSenseMapping) => void
}

export function AdminVideoPreview({
  source,
  cues,
  mappingIndex,
  selectedKeys,
  activeMappingId,
  onTokenClick,
  onMappedTokenClick,
}: AdminVideoPreviewProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCueIndex, setActiveCueIndex] = useState(-1)

  useEffect(() => {
    const video = ref.current
    if (!video || !source) return

    setError(null)
    let hls: Hls | null = null
    const onError = () => setError("The preview could not play this source.")
    video.addEventListener("error", onError)

    if (
      getMediaSourceKind(source) === "hls" &&
      !video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      if (Hls.isSupported()) {
        hls = new Hls()
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setError("The HLS preview encountered a fatal error.")
        })
        hls.loadSource(source)
        hls.attachMedia(video)
      } else {
        setError("HLS is not supported by this browser.")
      }
    } else {
      video.src = source
      video.load()
    }

    return () => {
      video.removeEventListener("error", onError)
      hls?.destroy()
      video.removeAttribute("src")
      video.load()
    }
  }, [source])

  useEffect(() => {
    const video = ref.current
    if (!video) return

    const syncCue = () => {
      setActiveCueIndex(findActiveCueIndex(cues, video.currentTime))
    }

    syncCue()
    video.addEventListener("timeupdate", syncCue)
    video.addEventListener("seeking", syncCue)
    video.addEventListener("loadedmetadata", syncCue)

    return () => {
      video.removeEventListener("timeupdate", syncCue)
      video.removeEventListener("seeking", syncCue)
      video.removeEventListener("loadedmetadata", syncCue)
    }
  }, [cues])

  const activeCue = activeCueIndex >= 0 ? cues[activeCueIndex] : null

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={ref}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black object-contain"
        />

        {activeCue ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-3 sm:bottom-16 sm:px-8">
            <div className="pointer-events-auto flex max-w-[92%] flex-wrap justify-center gap-x-1.5 gap-y-1 rounded-lg bg-black/70 px-3 py-2 text-center text-lg font-medium text-white shadow-lg backdrop-blur-sm sm:text-xl">
              {activeCue.tokens.map((token) => {
                const mapped = mappingIndex.get(token.key)
                const selected = selectedKeys.has(token.key)
                const belongsActive = mapped?.id === activeMappingId

                return (
                  <button
                    key={token.key}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      ref.current?.pause()
                      if (mapped && mapped.id !== activeMappingId && onMappedTokenClick) {
                        onMappedTokenClick(mapped)
                        return
                      }
                      onTokenClick(token)
                    }}
                    className={cn(
                      "rounded px-1.5 py-0.5 ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      mapped
                        ? mappingColor(mapped.id)
                        : selected
                          ? "bg-primary text-primary-foreground ring-primary"
                          : "bg-white/10 text-white ring-white/20 hover:bg-white/25",
                      belongsActive && "ring-2 ring-white",
                    )}
                    aria-pressed={selected || belongsActive}
                    title={mapped ? `Edit mapping #${mapped.id}` : "Select this subtitle occurrence"}
                  >
                    {token.word}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Every word in the active subtitle cue is selectable. Existing mapped words open their mapping for editing.
      </p>
    </div>
  )
}
