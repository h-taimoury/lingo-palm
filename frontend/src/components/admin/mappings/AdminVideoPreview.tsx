"use client"

import { useRef } from "react"
import { LoaderCircle } from "lucide-react"

import { mappingColor } from "@/components/admin/mappings/mappingStyles"
import { PlayerProvider, usePlayerStore, usePlayerStoreApi } from "@/components/video-player/PlayerProvider"
import { PlayerControls } from "@/components/video-player/controls/PlayerControls"
import { useMediaController } from "@/components/video-player/core/useMediaController"
import { findActiveCueIndex } from "@/lib/subtitles/findActiveCue"
import { getMappingTranslation } from "@/lib/subtitles/mappings"
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
  onMappedSenseClick?: (mapping: WordSenseMapping) => void
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
  onMappedSenseClick,
}: AdminVideoPreviewProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const store = usePlayerStoreApi()
  const error = usePlayerStore((state) => state.error)
  const status = usePlayerStore((state) => state.status)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const showShortTranslations = usePlayerStore((state) => state.showShortTranslations)
  const controller = useMediaController({ videoRef: ref, containerRef, source, store })
  const activeCueIndex = findActiveCueIndex(cues, currentTime)
  const activeCue = activeCueIndex >= 0 ? cues[activeCueIndex] : null
  const runs: { mapping: WordSenseMapping | undefined; tokens: SubtitleToken[] }[] = []
  for (const token of activeCue?.tokens ?? []) {
    const mapping = mappingIndex.get(token.key)
    const previous = runs.at(-1)
    if (mapping && previous?.mapping?.id === mapping.id) {
      previous.tokens.push(token)
    } else {
      runs.push({ mapping, tokens: [token] })
    }
  }
  const longestRuns = new Map<number, (typeof runs)[number]>()
  for (const run of runs) {
    if (!run.mapping) continue
    const longest = longestRuns.get(run.mapping.id)
    if (!longest || run.tokens.length > longest.tokens.length) {
      longestRuns.set(run.mapping.id, run)
    }
  }

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
            <div className={cn(
              "pointer-events-auto flex max-w-[92%] flex-wrap justify-center gap-x-1.5 gap-y-1 rounded-lg bg-black/70 px-3 py-2 text-center text-lg font-medium text-white shadow-lg backdrop-blur-sm sm:text-xl",
              showShortTranslations && "gap-y-5 pt-5",
            )}>
              {runs.map((run) => {
                const { mapping: mapped, tokens } = run
                const belongsActive = mapped?.id === activeMappingId
                const translation = showShortTranslations && mapped && longestRuns.get(mapped.id) === run
                  ? getMappingTranslation(mapped)
                  : ""

                return (
                  <div
                    key={tokens[0].key}
                    className={cn(
                      "relative flex max-w-full flex-wrap justify-center rounded",
                      mapped && "ring-1 ring-inset",
                      mapped && mappingColor(mapped.id),
                      belongsActive && "ring-2 ring-white",
                    )}
                  >
                    {tokens.map((token) => {
                      const selected = selectedKeys.has(token.key)
                      return (
                        <button
                          key={token.key}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            ref.current?.pause()
                            if (mapped && event.ctrlKey && onMappedSenseClick) {
                              onMappedSenseClick(mapped)
                              return
                            }
                            if (mapped && mapped.id !== activeMappingId && onMappedTokenClick) {
                              onMappedTokenClick(mapped)
                              return
                            }
                            onTokenClick(token)
                          }}
                          className={cn(
                            "relative max-w-full rounded px-1.5 py-0.5 transition [overflow-wrap:anywhere] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                            !mapped && "ring-1 ring-inset",
                            !mapped && (selected
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "bg-white/10 text-white ring-white/20 hover:bg-white/25"),
                          )}
                          aria-pressed={selected || belongsActive}
                          title={mapped ? `Edit mapping #${mapped.id} · Ctrl-click to view senses` : "Select this subtitle occurrence"}
                        >
                          {token.word}
                        </button>
                      )
                    })}
                    {translation ? (
                      <span lang="fa" dir="rtl" className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-1 text-[0.65em] font-medium leading-tight text-white">
                        {translation}
                      </span>
                    ) : null}
                  </div>
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
