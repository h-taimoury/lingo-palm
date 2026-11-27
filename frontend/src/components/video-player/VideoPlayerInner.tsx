"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, GraduationCap, LoaderCircle, TriangleAlert } from "lucide-react";

import {
  usePlayerStore,
  usePlayerStoreApi,
} from "@/components/video-player/PlayerProvider";
import { PlayerControls } from "@/components/video-player/controls/PlayerControls";
import { useActiveCue } from "@/components/video-player/core/useActiveCue";
import { useKeyboardShortcuts } from "@/components/video-player/core/useKeyboardShortcuts";
import { useMediaController } from "@/components/video-player/core/useMediaController";
import { LearningModal } from "@/components/video-player/learning/LearningModal";
import { filterMappingsByLevel, SENSE_LEVELS } from "@/components/video-player/learning/mappingLevels";
import type { SenseLevel } from "@/types/api/dictionary";
import {
  getCueLearningItems,
  getMappingLearningItems,
} from "@/components/video-player/learning/learningItems";
import { SubtitleOverlay } from "@/components/video-player/subtitles/SubtitleOverlay";
import type { VideoPlayerProps } from "@/components/video-player/VideoPlayer";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { loadVtt } from "@/lib/subtitles";
import { cn } from "@/lib/utils";
import type {
  VocabularyBulkActionRequest,
  VocabularyBulkActionResponse,
} from "@/types/api/vocabulary";
import type { SubtitleCue } from "@/types/subtitles";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

const noSenseIds: number[] = [];
const noCues: SubtitleCue[] = [];

export function VideoPlayerInner({
  source,
  subtitleSource,
  mappings: initialMappings,
  initialLearnedSenseIds = noSenseIds,
  initialKnownSenseIds,
  title,
  signInHref,
  clip,
}: VideoPlayerProps) {
  const t = useTranslations();

  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<number | null>(null);
  const [subtitleTrack, setSubtitleTrack] = useState<{
    source: string;
    cues: SubtitleCue[];
    error?: string;
  } | null>(null);
  const currentTrack = subtitleTrack?.source === subtitleSource ? subtitleTrack : null;
  const cues = currentTrack?.cues ?? noCues;
  const subtitleError = currentTrack?.error;
  const [mappings, setMappings] = useState(initialMappings);
  const [selectedLevels, setSelectedLevels] = useState<SenseLevel[]>(() => [...SENSE_LEVELS]);
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const visibleMappings = useMemo(
    () => filterMappingsByLevel(mappings, selectedLevels),
    [mappings, selectedLevels],
  );
  const [learnedSenseIds, setLearnedSenseIds] = useState<Set<number>>(
    () => new Set(initialLearnedSenseIds),
  );
  const [learningError, setLearningError] = useState<string | null>(null);
  const [knownSenseIds, setKnownSenseIds] = useState(() => new Set(initialKnownSenseIds));
  const [learningBusy, setLearningBusy] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const store = usePlayerStoreApi();
  const status = usePlayerStore((s) => s.status);
  const mediaError = usePlayerStore((s) => s.error);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isTheater = usePlayerStore((s) => s.isTheater);
  const activeCueIndex = usePlayerStore((s) => s.activeCueIndex);
  const modalMode = usePlayerStore((s) => s.modalMode);
  const activeMappingId = usePlayerStore((s) => s.activeMappingId);
  const activeSenseIndex = usePlayerStore((s) => s.activeSenseIndex);
  const toggleTheater = usePlayerStore((s) => s.toggleTheater);
  const openMappingState = usePlayerStore((s) => s.openMappingModal);
  const openCueState = usePlayerStore((s) => s.openCueModal);
  const nextSenseState = usePlayerStore((s) => s.nextSense);
  const previousSenseState = usePlayerStore((s) => s.previousSense);
  const setActiveSenseIndex = usePlayerStore((s) => s.setActiveSenseIndex);
  const controller = useMediaController({
    videoRef,
    containerRef,
    source,
    store,
    range: clip?.range,
  });
  useActiveCue({ cues });

  useEffect(() => {
    setMappings(initialMappings);
    setLearnedSenseIds(new Set(initialLearnedSenseIds));
    setKnownSenseIds(new Set(initialKnownSenseIds));
  }, [initialMappings, initialLearnedSenseIds, initialKnownSenseIds]);
  useEffect(() => {
    if (!subtitleSource) return;
    const abort = new AbortController();
    void loadVtt(subtitleSource, abort.signal)
      .then((parsed) => {
        if (!abort.signal.aborted) setSubtitleTrack({ source: subtitleSource, cues: parsed.cues });
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        setSubtitleTrack({
          source: subtitleSource,
          cues: noCues,
          error: error instanceof Error ? error.message : "Unable to load subtitles.",
        });
      });
    return () => abort.abort();
  }, [subtitleSource]);

  const activeCue = cues[activeCueIndex];
  const cueLearningItems = useMemo(
    () => getCueLearningItems(activeCue, visibleMappings),
    [activeCue, visibleMappings],
  );
  const hasCueLearningItems = cueLearningItems.length > 0;
  const learningItems = useMemo(
    () =>
      modalMode === "mapping"
        ? getMappingLearningItems(
            visibleMappings.find((m) => m.id === activeMappingId),
            activeCue,
          )
        : modalMode === "cue"
          ? cueLearningItems
          : [],
    [modalMode, visibleMappings, activeMappingId, activeCue, cueLearningItems],
  );

  const closeLearningModal = useCallback(() => {
    const state = store.getState();
    if (state.modalMode === "closed") return;
    state.closeLearningModal();
    if (state.wasPlayingBeforeModal) void controller.play();
  }, [store, controller]);
  const openMappingModal = useCallback(
    (mappingId: number) => {
      const wasPlaying = Boolean(videoRef.current && !videoRef.current.paused);
      videoRef.current?.pause();
      setLearningError(null);
      openMappingState(mappingId, wasPlaying);
      setControlsVisible(true);
    },
    [openMappingState],
  );
  const openCueModal = useCallback(() => {
    if (!hasCueLearningItems) return;
    setLevelMenuOpen(false);
    const wasPlaying = Boolean(videoRef.current && !videoRef.current.paused);
    videoRef.current?.pause();
    setLearningError(null);
    openCueState(wasPlaying);
    setControlsVisible(true);
  }, [hasCueLearningItems, openCueState]);
  const nextSense = useCallback(
    () => nextSenseState(learningItems.length),
    [nextSenseState, learningItems.length],
  );
  const previousSense = useCallback(
    () => previousSenseState(learningItems.length),
    [previousSenseState, learningItems.length],
  );

  useEffect(() => {
    if (modalMode === "closed") return;
    if (!learningItems.length) {
      closeLearningModal();
      return;
    }
    if (activeSenseIndex >= learningItems.length)
      setActiveSenseIndex(learningItems.length - 1);
  }, [
    modalMode,
    learningItems.length,
    activeSenseIndex,
    setActiveSenseIndex,
    closeLearningModal,
  ]);

  const keyboardController = useMemo(
    () => ({
      togglePlay: controller.togglePlay,
      seekBy: controller.seekBy,
      adjustVolume: controller.adjustVolume,
      toggleMute: controller.toggleMute,
      toggleFullscreen: controller.toggleFullscreen,
      toggleTheater: clip ? () => {} : toggleTheater,
      modalMode,
      openCueModal,
      closeModal: closeLearningModal,
      previousSense,
      nextSense,
    }),
    [
      controller,
      clip,
      toggleTheater,
      modalMode,
      openCueModal,
      closeLearningModal,
      previousSense,
      nextSense,
    ],
  );
  useKeyboardShortcuts({ enabled: true, controller: keyboardController });

  const clearHideTimer = useCallback(() => {
    if (controlsTimer.current !== null) {
      window.clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    }
  }, []);
  const scheduleHide = useCallback(() => {
    clearHideTimer();
    if (!isPlaying || modalMode !== "closed" || levelMenuOpen) return;
    controlsTimer.current = window.setTimeout(() => {
      setControlsVisible(false);
      controlsTimer.current = null;
    }, 2500);
  }, [clearHideTimer, isPlaying, modalMode, levelMenuOpen]);
  useEffect(() => {
    if (!isPlaying || modalMode !== "closed" || levelMenuOpen) {
      setControlsVisible(true);
      clearHideTimer();
    } else scheduleHide();
  }, [isPlaying, modalMode, levelMenuOpen, clearHideTimer, scheduleHide]);
  useEffect(() => clearHideTimer, [clearHideTimer]);

  async function markSenseLearned(senseId: number, alreadyKnown = false) {
    if (signInHref) {
      router.push(signInHref);
      return;
    }
    if (learningBusy || learnedSenseIds.has(senseId)) return;
    setLearningBusy(true);
    setLearningError(null);
    try {
      const payload: VocabularyBulkActionRequest = {
        action: alreadyKnown ? "set_already_known" : "set_learned",
        sense_ids: [senseId],
      };
      await apiClient.post<
        VocabularyBulkActionResponse,
        VocabularyBulkActionRequest
      >("/api/my-vocabulary/vocabulary/bulk-action/", payload);
      const nextLearned = new Set(learnedSenseIds);
      nextLearned.add(senseId);
      setLearnedSenseIds(nextLearned);
      if (alreadyKnown) setKnownSenseIds((current) => new Set([...current, senseId]));
      setMappings((current) => current.filter((mapping) =>
        mapping.senses.some((sense) => !nextLearned.has(sense.id)),
      ));
      router.refresh();
    } catch (error) {
      setLearningError(
        error instanceof ApiError
          ? error.message
          : "Unable to save this sense to your vocabulary.",
      );
    } finally {
      setLearningBusy(false);
    }
  }

  function revealControls() {
    setControlsVisible(true);
    scheduleHide();
  }
  function isInteractive(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(target.closest("[data-player-interactive='true']"))
    );
  }
  function surfaceClick(event: React.MouseEvent<HTMLDivElement>) {
    if (modalMode !== "closed" || isInteractive(event.target)) return;
    controller.togglePlay();
  }
  function surfaceDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (modalMode !== "closed" || isInteractive(event.target)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    controller.seekBy(event.clientX - rect.left < rect.width / 2 ? -10 : 10);
  }

  return (
    <div
      data-theater={isTheater}
      className={cn(
        "transition-colors",
        isTheater &&
          "relative left-1/2 w-[100cqw] -translate-x-1/2 bg-black py-4 sm:py-6",
      )}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={cn(
          "group overflow-hidden bg-black outline-none",
          controller.expanded
            ? "fixed inset-0 z-50 h-dvh w-screen"
            : "relative aspect-video w-full rounded-xl shadow-sm [&:fullscreen]:rounded-none [&:fullscreen]:shadow-none",
        )}
        onMouseMove={revealControls}
        onMouseLeave={() => isPlaying && scheduleHide()}
        onTouchStart={revealControls}
        onClick={surfaceClick}
        onDoubleClick={surfaceDoubleClick}
      >
        <video
          ref={videoRef}
          aria-label={title ? t("Video: {0}", { 0: title }) : t("Lesson video")}
          playsInline
          preload="metadata"
          className="h-full w-full bg-black object-contain"
        />
        <SubtitleOverlay
          cues={cues}
          mappings={visibleMappings}
          onOpenMapping={openMappingModal}
        />
        {clip ? (
          <nav
            aria-label={t("Video examples")}
            data-player-interactive="true"
            data-player-native-keys="true"
            className="absolute right-2 top-2 z-40 flex items-center gap-1 rounded-md bg-black/75 p-1 text-white"
          >
            <button
              type="button"
              aria-label={t("Previous clip")}
              title={t("Previous clip")}
              disabled={!clip.onPrevious}
              onClick={clip.onPrevious}
              className="grid size-9 place-items-center rounded hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span className="px-1 text-sm tabular-nums" aria-live="polite">
              {clip.position} / {clip.count}
            </span>
            <button
              type="button"
              aria-label={t("Next clip")}
              title={t("Next clip")}
              disabled={!clip.onNext}
              onClick={clip.onNext}
              className="grid size-9 place-items-center rounded hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </nav>
        ) : null}
        {modalMode === "closed" && hasCueLearningItems ? (
          <button
            type="button"
            data-player-interactive="true"
            onClick={(e) => {
              e.stopPropagation();
              openCueModal();
            }}
            className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full bg-black/65 text-white shadow-md hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t("Open vocabulary for current subtitle")}
            title={t("Learn current subtitle (Enter)")}
          >
            <GraduationCap className="size-5" />
          </button>
        ) : null}
        {(status === "loading" || status === "buffering") && !mediaError ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <span className="rounded-full bg-black/55 p-3">
              <LoaderCircle className="size-7 animate-spin text-white" />
            </span>
          </div>
        ) : null}
        {mediaError ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-6 text-center text-white">
            <div>
              <TriangleAlert className="mx-auto size-8" />
              <p className="mt-3 font-medium">{t("Unable to play this video")}</p>
              <p className="mt-1 text-sm text-white/70">{mediaError.message}</p>
            </div>
          </div>
        ) : null}
        {subtitleError ? (
          <div
            role="status"
            data-player-interactive="true"
            className="absolute left-3 top-3 z-20 max-w-sm rounded-md bg-black/70 px-3 py-2 text-xs text-white/80"
          >
            {t("Subtitles unavailable: {0}", { 0: subtitleError })}</div>
        ) : null}
        <div
          aria-hidden={modalMode !== "closed"}
          className={cn(
            "transition-opacity duration-200",
            modalMode !== "closed" && "pointer-events-none",
            clip || controlsVisible || !isPlaying
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <PlayerControls
            onTogglePlay={controller.togglePlay}
            onSeek={controller.seekTo}
            onVolumeChange={controller.setVolume}
            onToggleMute={controller.toggleMute}
            onPlaybackRateChange={controller.setPlaybackRate}
            onToggleFullscreen={() => void controller.toggleFullscreen()}
            onToggleTheater={clip ? undefined : toggleTheater}
            selectedLevels={clip ? undefined : selectedLevels}
            onLevelsChange={setSelectedLevels}
            levelMenuOpen={levelMenuOpen}
            onLevelMenuOpenChange={setLevelMenuOpen}
            range={clip?.range}
          />
        </div>
        {modalMode !== "closed" ? (
          <LearningModal
            items={learningItems}
            activeIndex={activeSenseIndex}
            learnedSenseIds={learnedSenseIds}
            knownSenseIds={knownSenseIds}
            isSubmitting={learningBusy}
            error={learningError}
            onClose={closeLearningModal}
            onPrevious={previousSense}
            onNext={nextSense}
            onLearn={markSenseLearned}
            onAlreadyKnown={(senseId) => void markSenseLearned(senseId, true)}
          />
        ) : null}
      </div>
    </div>
  );
}
