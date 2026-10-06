"use client"

import { useRef } from "react"
import { LoaderCircle } from "lucide-react"

import { mappingColor } from "@/components/admin/mappings/mappingStyles"
import { PlayerProvider, usePlayerStore, usePlayerStoreApi } from "@/components/video-player/PlayerProvider"
import { PlayerControls } from "@/components/video-player/controls/PlayerControls"
import { useMediaController } from "@/components/video-player/core/useMediaController"
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

export function AdminVideoPreview(props: AdminVideoPreviewProps) {
  return (
    <PlayerProvider>
      <AdminVideoPreviewInner {...props} />
    </PlayerProvider>
  )
}

function AdminVideoPreviewInner({
  source,
  cues,
  mappingIndex,
  selectedKeys,
  activeMappingId,
  onTokenClick,
  onMappedTokenClick,
}: AdminVideoPreviewProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const store = usePlayerStoreApi()
  const error = usePlayerStore((state) => state.error)
  const status = usePlayerStore((state) => state.status)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const controller = useMediaController({ videoRef: ref, containerRef, source, store })
  const activeCueIndex = findActiveCueIndex(cues, currentTime)
  const activeCue = activeCueIndex >= 0 ? cues[activeCueIndex] : null

  return (
    <div>
      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="Section video preview"
        className="relative aspect-video overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-ring [&:fullscreen]:rounded-none"
        onKeyDown={(event) => {
          const target = event.target as HTMLElement
          if (target.closest("input, select, textarea, [contenteditable='true']")) return
          if ((event.key === " " || event.key === "Enter") && target.closest("button, a")) return
          const key = event.key.toLowerCase()
          if ([" ", "k", "j", "l", "arrowleft", "arrowright", "m", "f"].includes(key)) {
            event.preventDefault()
            event.stopPropagation()
          }
          if (key === " " || key === "k") controller.togglePlay()
          else if (key === "j" || key === "arrowleft") controller.seekBy(-5)
          else if (key === "l" || key === "arrowright") controller.seekBy(5)
          else if (key === "m") controller.toggleMute()
          else if (key === "f") void controller.toggleFullscreen()
        }}
      >
        <video
          ref={ref}
          aria-label="Section preview video"
          playsInline
          preload="metadata"
          className="h-full w-full bg-black object-contain"
          onClick={controller.togglePlay}
        />

        {activeCue ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-3 sm:px-8">
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
        {(status === "loading" || status === "buffering") && !error ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <LoaderCircle className="size-8 animate-spin text-white" aria-label="Loading video" />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="absolute inset-x-3 top-3 rounded-md bg-black/80 p-3 text-sm text-white">
            {error.message}
          </p>
        ) : null}
        <PlayerControls
          onTogglePlay={controller.togglePlay}
          onSeek={controller.seekTo}
          onVolumeChange={controller.setVolume}
          onToggleMute={controller.toggleMute}
          onPlaybackRateChange={controller.setPlaybackRate}
          onToggleFullscreen={() => void controller.toggleFullscreen()}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Every word in the active subtitle cue is selectable. Existing mapped words open their mapping for editing.
      </p>
    </div>
  )
}
