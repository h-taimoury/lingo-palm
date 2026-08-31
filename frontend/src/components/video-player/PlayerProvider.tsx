"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react"
import { useStore } from "zustand"

import {
  createPlayerStore,
  PLAYER_PREFERENCES_STORAGE_KEY,
  type PlayerStore,
  type PlayerStoreState,
} from "@/components/video-player/core/playerStore"

type PlayerProviderProps = {
  children: ReactNode
}

const PlayerStoreContext = createContext<PlayerStore | null>(null)

export function PlayerProvider({ children }: PlayerProviderProps) {
  const storeRef = useRef<PlayerStore | null>(null)

  if (!storeRef.current) {
    storeRef.current = createPlayerStore()
  }

  useEffect(() => {
    const store = storeRef.current

    if (!store) {
      return
    }

    try {
      const raw = window.localStorage.getItem(PLAYER_PREFERENCES_STORAGE_KEY)

      if (raw) {
        const parsed = JSON.parse(raw) as {
          volume?: number
          isMuted?: boolean
          playbackRate?: number
        }

        store.getState().hydratePreferences(parsed)
      }
    } catch {
      // Corrupt or unavailable localStorage should never block playback.
    }

    return store.subscribe((state, previousState) => {
      if (
        state.volume === previousState.volume &&
        state.isMuted === previousState.isMuted &&
        state.playbackRate === previousState.playbackRate
      ) {
        return
      }

      try {
        window.localStorage.setItem(
          PLAYER_PREFERENCES_STORAGE_KEY,
          JSON.stringify({
            volume: state.volume,
            isMuted: state.isMuted,
            playbackRate: state.playbackRate,
          }),
        )
      } catch {
        // Preferences are optional; playback must continue without storage.
      }
    })
  }, [])

  return (
    <PlayerStoreContext.Provider value={storeRef.current}>
      {children}
    </PlayerStoreContext.Provider>
  )
}

export function usePlayerStoreApi(): PlayerStore {
  const store = useContext(PlayerStoreContext)

  if (!store) {
    throw new Error("usePlayerStoreApi must be used inside PlayerProvider.")
  }

  return store
}

export function usePlayerStore<T>(
  selector: (state: PlayerStoreState) => T,
): T {
  const store = usePlayerStoreApi()
  return useStore(store, selector)
}
