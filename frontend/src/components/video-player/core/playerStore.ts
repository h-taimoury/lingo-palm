import { createStore } from "zustand/vanilla"

import type {
  LearningModalMode,
  PlayerMediaError,
  PlayerState,
  PlayerStatus,
} from "@/types/player"

export const PLAYER_PREFERENCES_STORAGE_KEY = "lingopalm.player.preferences"

export type PlayerStoreState = PlayerState & {
  setCurrentTime: (value: number) => void
  setDuration: (value: number) => void
  setPlaying: (value: boolean) => void
  setEnded: (value: boolean) => void
  setBuffering: (value: boolean) => void
  setVolumeState: (volume: number, isMuted: boolean) => void
  setPlaybackRateState: (value: number) => void
  setFullscreen: (value: boolean) => void
  toggleTheater: () => void
  setActiveCueIndex: (value: number) => void
  setStatus: (value: PlayerStatus) => void
  setError: (value: PlayerMediaError | null) => void

  openMappingModal: (mappingId: number, wasPlaying: boolean) => void
  openCueModal: (wasPlaying: boolean) => void
  closeLearningModal: () => void
  setActiveSenseIndex: (value: number) => void
  nextSense: (senseCount: number) => void
  previousSense: (senseCount: number) => void

  hydratePreferences: (preferences: {
    volume?: number
    isMuted?: boolean
    playbackRate?: number
  }) => void
  resetForSource: () => void
}

export type PlayerStore = ReturnType<typeof createPlayerStore>

const initialState: PlayerState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isEnded: false,
  isBuffering: false,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isFullscreen: false,
  isTheater: false,
  activeCueIndex: -1,
  status: "idle",
  error: null,

  modalMode: "closed",
  activeMappingId: null,
  activeSenseIndex: 0,
  wasPlayingBeforeModal: false,
}

export function createPlayerStore() {
  return createStore<PlayerStoreState>()((set) => ({
    ...initialState,

    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setEnded: (isEnded) => set({ isEnded }),
    setBuffering: (isBuffering) => set({ isBuffering }),
    setVolumeState: (volume, isMuted) =>
      set({
        volume: clamp(volume, 0, 1),
        isMuted,
      }),
    setPlaybackRateState: (playbackRate) =>
      set({ playbackRate: clamp(playbackRate, 0.25, 4) }),
    setFullscreen: (isFullscreen) => set({ isFullscreen }),
    toggleTheater: () =>
      set((state) => ({
        isTheater: !state.isTheater,
      })),
    setActiveCueIndex: (activeCueIndex) => set({ activeCueIndex }),
    setStatus: (status) => set({ status }),
    setError: (error) => set({ error }),

    openMappingModal: (activeMappingId, wasPlayingBeforeModal) =>
      set({
        modalMode: "mapping",
        activeMappingId,
        activeSenseIndex: 0,
        wasPlayingBeforeModal,
      }),
    openCueModal: (wasPlayingBeforeModal) =>
      set({
        modalMode: "cue",
        activeMappingId: null,
        activeSenseIndex: 0,
        wasPlayingBeforeModal,
      }),
    closeLearningModal: () =>
      set({
        modalMode: "closed",
        activeMappingId: null,
        activeSenseIndex: 0,
        wasPlayingBeforeModal: false,
      }),
    setActiveSenseIndex: (activeSenseIndex) =>
      set({ activeSenseIndex: Math.max(0, activeSenseIndex) }),
    nextSense: (senseCount) =>
      set((state) => ({
        activeSenseIndex:
          senseCount <= 0
            ? 0
            : Math.min(state.activeSenseIndex + 1, senseCount - 1),
      })),
    previousSense: (senseCount) =>
      set((state) => ({
        activeSenseIndex:
          senseCount <= 0
            ? 0
            : Math.max(state.activeSenseIndex - 1, 0),
      })),

    hydratePreferences: (preferences) =>
      set((state) => ({
        volume:
          preferences.volume === undefined
            ? state.volume
            : clamp(preferences.volume, 0, 1),
        isMuted: preferences.isMuted ?? state.isMuted,
        playbackRate:
          preferences.playbackRate === undefined
            ? state.playbackRate
            : clamp(preferences.playbackRate, 0.25, 4),
      })),
    resetForSource: () =>
      set((state) => ({
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isEnded: false,
        isBuffering: false,
        activeCueIndex: -1,
        status: "loading",
        error: null,

        modalMode: "closed" as LearningModalMode,
        activeMappingId: null,
        activeSenseIndex: 0,
        wasPlayingBeforeModal: false,

        volume: state.volume,
        isMuted: state.isMuted,
        playbackRate: state.playbackRate,
        isFullscreen: state.isFullscreen,
        isTheater: state.isTheater,
      })),
  }))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
