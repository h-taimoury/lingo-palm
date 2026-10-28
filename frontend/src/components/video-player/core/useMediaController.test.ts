import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PlayerStore, PlayerStoreState } from "./playerStore"

const mocks = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  store: null as PlayerStore | null,
}))
vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => mocks.effects.push(effect),
  useState: () => [null, vi.fn()],
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
}))
vi.mock("./useHls", () => ({ useHls: vi.fn() }))
vi.mock("@/components/video-player/PlayerProvider", () => ({
  usePlayerStore: (selector: (state: PlayerStoreState) => unknown) => selector(mocks.store!.getState()),
}))

import { createPlayerStore } from "./playerStore"
import { useMediaController } from "./useMediaController"

describe("settled media seeks", () => {
  beforeEach(() => { mocks.effects = []; mocks.store = createPlayerStore() })

  it.each([5, 40, 80])("resets the cue from the settled media time %s, including paused/same-time seeks", (settledTime) => {
    const video = Object.assign(new EventTarget(), { currentTime: 40, paused: true })
    const store = mocks.store!
    store.setState({ currentTime: 40, activeCueIndex: 6 })
    useMediaController({
      videoRef: { current: video as HTMLVideoElement },
      containerRef: { current: null }, source: "lesson.m3u8", store,
    })
    // The first effect captures the media ref; the second binds media events.
    const cleanup = mocks.effects[1]()
    video.currentTime = settledTime
    video.dispatchEvent(new Event("seeked"))
    expect(store.getState().currentTime).toBe(settledTime)
    expect(store.getState().activeCueIndex).toBe(-1)
    cleanup?.()
    video.currentTime = 120
    video.dispatchEvent(new Event("seeked"))
    expect(store.getState().currentTime).toBe(settledTime)
  })
})
