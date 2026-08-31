export type PlayerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "buffering"
  | "error"

export type LearningModalMode = "closed" | "mapping" | "cue"

export type PlayerMediaError = {
  message: string
  code?: number
}

export type PlayerPreferences = {
  volume: number
  isMuted: boolean
  playbackRate: number
}

export type PlayerState = PlayerPreferences & {
  currentTime: number
  duration: number
  isPlaying: boolean
  isEnded: boolean
  isBuffering: boolean
  isFullscreen: boolean
  isTheater: boolean
  activeCueIndex: number
  status: PlayerStatus
  error: PlayerMediaError | null

  modalMode: LearningModalMode
  activeMappingId: number | null
  activeSenseIndex: number
  wasPlayingBeforeModal: boolean
}
