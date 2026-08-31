"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GraduationCap, LoaderCircle, TriangleAlert } from "lucide-react"

import { usePlayerStore, usePlayerStoreApi } from "@/components/video-player/PlayerProvider"
import { PlayerControls } from "@/components/video-player/controls/PlayerControls"
import { useActiveCue } from "@/components/video-player/core/useActiveCue"
import { useKeyboardShortcuts } from "@/components/video-player/core/useKeyboardShortcuts"
import { useMediaController } from "@/components/video-player/core/useMediaController"
import { LearningModal } from "@/components/video-player/learning/LearningModal"
import { cueHasMappings, getCueLearningItems, getMappingLearningItems } from "@/components/video-player/learning/learningItems"
import { SubtitleOverlay } from "@/components/video-player/subtitles/SubtitleOverlay"
import { apiClient } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { loadVtt } from "@/lib/subtitles"
import { cn } from "@/lib/utils"
import type { WordSenseMapping } from "@/types/api/courses"
import type { VocabularyBulkActionRequest, VocabularyBulkActionResponse } from "@/types/api/vocabulary"
import type { SubtitleCue } from "@/types/subtitles"

export function VideoPlayerInner({ source, subtitleSource, mappings: initialMappings, initialLearnedSenseIds = [], title }: { source: string; subtitleSource?: string | null; mappings: WordSenseMapping[]; initialLearnedSenseIds?: number[]; title?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null); const containerRef = useRef<HTMLDivElement>(null); const controlsTimer = useRef<number | null>(null)
  const [cues, setCues] = useState<SubtitleCue[]>([]); const [mappings, setMappings] = useState(initialMappings); const [learnedSenseIds, setLearnedSenseIds] = useState<Set<number>>(() => new Set(initialLearnedSenseIds)); const [learningError, setLearningError] = useState<string | null>(null); const [learningBusy, setLearningBusy] = useState(false); const [subtitleError, setSubtitleError] = useState<string | null>(null); const [controlsVisible, setControlsVisible] = useState(true)
  const store = usePlayerStoreApi(); const status = usePlayerStore((s) => s.status); const mediaError = usePlayerStore((s) => s.error); const isPlaying = usePlayerStore((s) => s.isPlaying); const isTheater = usePlayerStore((s) => s.isTheater); const activeCueIndex = usePlayerStore((s) => s.activeCueIndex); const modalMode = usePlayerStore((s) => s.modalMode); const activeMappingId = usePlayerStore((s) => s.activeMappingId); const activeSenseIndex = usePlayerStore((s) => s.activeSenseIndex); const wasPlayingBeforeModal = usePlayerStore((s) => s.wasPlayingBeforeModal); const toggleTheater = usePlayerStore((s) => s.toggleTheater); const openMappingState = usePlayerStore((s) => s.openMappingModal); const openCueState = usePlayerStore((s) => s.openCueModal); const closeModalState = usePlayerStore((s) => s.closeLearningModal); const nextSenseState = usePlayerStore((s) => s.nextSense); const previousSenseState = usePlayerStore((s) => s.previousSense); const setActiveSenseIndex = usePlayerStore((s) => s.setActiveSenseIndex)
  const controller = useMediaController({ videoRef, containerRef, source, store }); useActiveCue({ cues })

  useEffect(() => { setMappings(initialMappings); setLearnedSenseIds(new Set(initialLearnedSenseIds)) }, [initialMappings, initialLearnedSenseIds])
  useEffect(() => { if (!subtitleSource) { setCues([]); setSubtitleError(null); return } const abort = new AbortController(); void loadVtt(subtitleSource, abort.signal).then((parsed) => { setCues(parsed.cues); setSubtitleError(null) }).catch((error: unknown) => { if (abort.signal.aborted) return; setCues([]); setSubtitleError(error instanceof Error ? error.message : "Unable to load subtitles.") }); return () => abort.abort() }, [subtitleSource])

  const activeCue = cues[activeCueIndex]
  const learningItems = useMemo(() => modalMode === "mapping" ? getMappingLearningItems(mappings.find((m) => m.id === activeMappingId), activeCue) : modalMode === "cue" ? getCueLearningItems(activeCue, mappings) : [], [modalMode, mappings, activeMappingId, activeCue])
  const hasCueMappings = useMemo(() => cueHasMappings(activeCue, mappings), [activeCue, mappings])

  const closeLearningModal = useCallback(() => { const resume = wasPlayingBeforeModal; closeModalState(); setLearningError(null); if (resume) void controller.play() }, [wasPlayingBeforeModal, closeModalState, controller])
  const openMappingModal = useCallback((mappingId: number) => { const wasPlaying = Boolean(videoRef.current && !videoRef.current.paused); videoRef.current?.pause(); setLearningError(null); openMappingState(mappingId, wasPlaying); setControlsVisible(true) }, [openMappingState])
  const openCueModal = useCallback(() => { if (!hasCueMappings) return; const wasPlaying = Boolean(videoRef.current && !videoRef.current.paused); videoRef.current?.pause(); setLearningError(null); openCueState(wasPlaying); setControlsVisible(true) }, [hasCueMappings, openCueState])
  const nextSense = useCallback(() => nextSenseState(learningItems.length), [nextSenseState, learningItems.length]); const previousSense = useCallback(() => previousSenseState(learningItems.length), [previousSenseState, learningItems.length])

  useEffect(() => { if (modalMode === "closed") return; if (!learningItems.length) { closeLearningModal(); return } if (activeSenseIndex >= learningItems.length) setActiveSenseIndex(learningItems.length - 1) }, [modalMode, learningItems.length, activeSenseIndex, setActiveSenseIndex, closeLearningModal])

  const keyboardController = useMemo(() => ({ togglePlay: controller.togglePlay, seekBy: controller.seekBy, toggleMute: controller.toggleMute, toggleFullscreen: controller.toggleFullscreen, toggleTheater, modalMode, openCueModal, closeModal: closeLearningModal, previousSense, nextSense }), [controller, toggleTheater, modalMode, openCueModal, closeLearningModal, previousSense, nextSense])
  useKeyboardShortcuts({ enabled: true, controller: keyboardController })

  const clearHideTimer = useCallback(() => { if (controlsTimer.current !== null) { window.clearTimeout(controlsTimer.current); controlsTimer.current = null } }, [])
  const scheduleHide = useCallback(() => { clearHideTimer(); if (!isPlaying || modalMode !== "closed") return; controlsTimer.current = window.setTimeout(() => { setControlsVisible(false); controlsTimer.current = null }, 2500) }, [clearHideTimer, isPlaying, modalMode])
  useEffect(() => { if (!isPlaying || modalMode !== "closed") { setControlsVisible(true); clearHideTimer() } else scheduleHide() }, [isPlaying, modalMode, clearHideTimer, scheduleHide])
  useEffect(() => clearHideTimer, [clearHideTimer])

  async function markSenseLearned(senseId: number) {
    if (learnedSenseIds.has(senseId)) return
    setLearningBusy(true); setLearningError(null)
    try {
      const payload: VocabularyBulkActionRequest = { action: "set_learned", sense_ids: [senseId] }
      await apiClient.post<VocabularyBulkActionResponse, VocabularyBulkActionRequest>("/api/my-vocabulary/vocabulary/bulk-action/", payload)
      const nextLearned = new Set(learnedSenseIds); nextLearned.add(senseId); setLearnedSenseIds(nextLearned)
      const removedIds = new Set<number>(); const nextMappings = mappings.filter((mapping) => { const fullyLearned = mapping.senses.every((sense) => nextLearned.has(sense.id)); if (fullyLearned) removedIds.add(mapping.id); return !fullyLearned })
      setMappings(nextMappings)
      if ((modalMode === "mapping" && activeMappingId !== null && removedIds.has(activeMappingId)) || (modalMode === "cue" && !cueHasMappings(activeCue, nextMappings))) closeLearningModal()
    } catch (error) { setLearningError(error instanceof ApiError ? error.message : "Unable to mark this sense as learned.") } finally { setLearningBusy(false) }
  }

  function revealControls() { setControlsVisible(true); scheduleHide() }
  function isInteractive(target: EventTarget | null) { return target instanceof HTMLElement && Boolean(target.closest("[data-player-interactive='true']")) }
  function surfaceClick(event: React.MouseEvent<HTMLDivElement>) { if (modalMode !== "closed" || isInteractive(event.target)) return; controller.togglePlay() }
  function surfaceDoubleClick(event: React.MouseEvent<HTMLDivElement>) { if (modalMode !== "closed" || isInteractive(event.target)) return; const rect = event.currentTarget.getBoundingClientRect(); controller.seekBy(event.clientX - rect.left < rect.width / 2 ? -10 : 10) }

  return <div className={cn("transition-all", isTheater && "relative left-1/2 w-screen -translate-x-1/2 bg-black py-4 sm:py-6")}><div ref={containerRef} className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm" onMouseMove={revealControls} onMouseLeave={() => isPlaying && scheduleHide()} onTouchStart={revealControls} onClick={surfaceClick} onDoubleClick={surfaceDoubleClick}><video ref={videoRef} aria-label={title ? `Video: ${title}` : "Lesson video"} playsInline preload="metadata" className="h-full w-full bg-black object-contain" /><SubtitleOverlay cues={cues} mappings={mappings} onOpenMapping={openMappingModal} />{modalMode === "closed" && hasCueMappings ? <button type="button" data-player-interactive="true" onClick={(e) => { e.stopPropagation(); openCueModal() }} className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full bg-black/65 text-white shadow-md hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Open vocabulary for current subtitle" title="Learn current subtitle (Enter)"><GraduationCap className="size-5" /></button> : null}{(status === "loading" || status === "buffering") && !mediaError ? <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><span className="rounded-full bg-black/55 p-3"><LoaderCircle className="size-7 animate-spin text-white" /></span></div> : null}{mediaError ? <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-6 text-center text-white"><div><TriangleAlert className="mx-auto size-8" /><p className="mt-3 font-medium">Unable to play this video</p><p className="mt-1 text-sm text-white/70">{mediaError.message}</p></div></div> : null}{subtitleError ? <div role="status" data-player-interactive="true" className="absolute left-3 top-3 z-20 max-w-sm rounded-md bg-black/70 px-3 py-2 text-xs text-white/80">Subtitles unavailable: {subtitleError}</div> : null}<div aria-hidden={modalMode !== "closed"} className={cn("transition-opacity duration-200", modalMode !== "closed" && "pointer-events-none", controlsVisible || !isPlaying ? "opacity-100" : "pointer-events-none opacity-0")}><PlayerControls onTogglePlay={controller.togglePlay} onSeek={controller.seekTo} onVolumeChange={controller.setVolume} onToggleMute={controller.toggleMute} onPlaybackRateChange={controller.setPlaybackRate} onToggleFullscreen={() => void controller.toggleFullscreen()} onToggleTheater={toggleTheater} /></div>{modalMode !== "closed" ? <LearningModal items={learningItems} activeIndex={activeSenseIndex} learnedSenseIds={learnedSenseIds} isSubmitting={learningBusy} error={learningError} onClose={closeLearningModal} onPrevious={previousSense} onNext={nextSense} onLearn={markSenseLearned} /> : null}</div></div>
}
