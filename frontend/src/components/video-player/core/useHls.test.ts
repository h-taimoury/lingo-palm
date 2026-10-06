import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  effect: null as (() => void | (() => void)) | null,
  supported: true,
  instances: [] as Array<{
    loadSource: ReturnType<typeof vi.fn>
    attachMedia: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => { mocks.effect = effect },
}))

vi.mock("hls.js", () => ({
  default: class {
    static isSupported = () => mocks.supported
    static Events = { ERROR: "error" }
    static ErrorTypes = { NETWORK_ERROR: "network", MEDIA_ERROR: "media" }
    loadSource = vi.fn()
    attachMedia = vi.fn()
    destroy = vi.fn()
    on = vi.fn()
    constructor() { mocks.instances.push(this) }
  },
}))

import { createPlayerStore } from "./playerStore"
import { useHls } from "./useHls"

function MountSource(source: string, nativeHls = false) {
  const video = {
    src: "",
    setAttribute: vi.fn(),
    load: vi.fn(),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
    canPlayType: vi.fn(() => nativeHls ? "probably" : ""),
  }
  const store = createPlayerStore()
  store.getState().setError({ message: "Previous source failed" })
  useHls({ video: video as unknown as HTMLVideoElement, source, store })
  const cleanup = mocks.effect?.()
  return { video, store, cleanup }
}

describe("shared admin and lesson media loading", () => {
  beforeEach(() => {
    mocks.effect = null
    mocks.instances = []
    mocks.supported = true
  })

  it.each(["/videos/lesson.mp4", "blob:http://localhost/local-video"])(
    "keeps progressive/local playback for %s and releases it on source change",
    (source) => {
      const { video, store, cleanup } = MountSource(source)
      expect(video.setAttribute).toHaveBeenCalledWith("src", source)
      expect(video.load).toHaveBeenCalledOnce()
      expect(mocks.instances).toHaveLength(0)
      expect(store.getState().error).toBeNull()
      cleanup?.()
      expect(video.pause).toHaveBeenCalledOnce()
      expect(video.removeAttribute).toHaveBeenCalledWith("src")
    },
  )

  it("attaches signed HLS URLs through hls.js and destroys the old stream", () => {
    const source = "https://stream.example/video.M3U8?token=signed#preview"
    const { video, cleanup } = MountSource(source)
    const hls = mocks.instances[0]
    expect(hls.loadSource).toHaveBeenCalledWith(source)
    expect(hls.attachMedia).toHaveBeenCalledWith(video)
    cleanup?.()
    expect(hls.destroy).toHaveBeenCalledOnce()
    expect(video.removeAttribute).toHaveBeenCalledWith("src")
  })

  it("uses native HLS where supported", () => {
    const source = "https://stream.example/lesson.m3u8"
    const { video, cleanup } = MountSource(source, true)
    expect(video.setAttribute).toHaveBeenCalledWith("src", source)
    expect(mocks.instances).toHaveLength(0)
    cleanup?.()
    expect(video.removeAttribute).toHaveBeenCalledWith("src")
  })

  it("reports unsupported HLS", () => {
    mocks.supported = false
    const { store } = MountSource("https://stream.example/lesson.m3u8")
    expect(store.getState().status).toBe("error")
    expect(store.getState().error?.message).toContain("not supported")
  })

  it("ignores recoverable HLS errors and reports fatal network errors", () => {
    const { store } = MountSource("https://stream.example/lesson.m3u8")
    const onError = mocks.instances[0].on.mock.calls[0][1]
    onError("error", { fatal: false, type: "network" })
    expect(store.getState().error).toBeNull()
    onError("error", { fatal: true, type: "network" })
    expect(store.getState().status).toBe("error")
    expect(store.getState().error?.message).toBe("The video stream could not be loaded.")
  })
})
