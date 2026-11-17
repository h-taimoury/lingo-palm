import { expect, it, vi } from "vitest"
import type { PlayerStoreState } from "./playerStore"
import { createPlayerStore } from "./playerStore"
import { useActiveCue } from "./useActiveCue"
import { parseVtt } from "@/lib/subtitles"

const store = vi.hoisted(() => ({ current: {} as PlayerStoreState }))
vi.mock("react", () => ({ useEffect: (effect: () => void) => effect() }))
vi.mock("@/components/video-player/PlayerProvider", () => ({
  usePlayerStore: (selector: (state: PlayerStoreState) => unknown) => selector(store.current),
}))

const { cues } = parseVtt(`WEBVTT

1
00:01:10.000 --> 00:01:12.000
Earlier subtitle

2
00:01:15.818 --> 00:01:19.320
Long subtitle

3
00:01:16.514 --> 00:01:18.807
Short subtitle
`)

it.each([
  [75, -1, -1],
  [76.514, 1, 2],
  [76.514, -1, 2],
  [78.807, 2, 1],
  [79, -1, 1],
  [79.32, 1, -1],
])("at %s seconds, changes cue %s to %s during playback or after seeking", (time, current, expected) => {
  const player = createPlayerStore()
  player.setState({ currentTime: time, activeCueIndex: current })
  store.current = player.getState()

  useActiveCue({ cues })

  expect(player.getState().activeCueIndex).toBe(expected)
})
