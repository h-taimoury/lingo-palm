import { afterEach, describe, expect, it, vi } from "vitest"
import { attachHlsDiagnostics, hlsDiagnosticOptions } from "./hlsDiagnostics"
import { createPlayerStore } from "./playerStore"

afterEach(() => vi.restoreAllMocks())

describe("opt-in HLS diagnostics", () => {
  it("does not force the HLS engine without the debug flag", () => {
    expect(hlsDiagnosticOptions("?hlsEngine=js")).toEqual({ enabled: false, forceJs: false })
    expect(hlsDiagnosticOptions("?hlsDebug=1&hlsEngine=js")).toEqual({ enabled: true, forceJs: true })
    expect(hlsDiagnosticOptions("?hlsDebug=1")).toEqual({ enabled: true, forceJs: false })
  })

  it("records native seek/frame timing, omits URLs, and removes listeners on cleanup", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => {})
    const listeners = new Map<string, EventListener>()
    let onFrame: VideoFrameRequestCallback | undefined
    const video = {
      currentTime: 42, seeking: false, paused: true, readyState: 4,
      src: "https://private.example/signed.m3u8?token=secret",
      buffered: { length: 1, start: () => 40, end: () => 50 },
      addEventListener: vi.fn((name, callback) => listeners.set(name, callback)),
      removeEventListener: vi.fn((name) => listeners.delete(name)),
      requestVideoFrameCallback: vi.fn((callback) => { onFrame = callback; return 7 }),
      cancelVideoFrameCallback: vi.fn(),
    }
    const store = createPlayerStore()
    store.getState().setCurrentTime(41)
    const cleanup = attachHlsDiagnostics(video as unknown as HTMLVideoElement, store, "native-hls")
    expect(output.mock.calls[0][1]).toMatchObject({ engine: "native-hls", currentTime: 42, storeTime: 41 })
    listeners.get("seeked")?.(new Event("seeked"))
    onFrame?.(0, { mediaTime: 42.04 } as VideoFrameCallbackMetadata)
    expect(output.mock.calls.at(-1)?.[1]).toMatchObject({ event: "frame-after-seek", frameMediaTime: 42.04 })
    listeners.get("seeked")?.(new Event("seeked"))
    cleanup()
    expect(listeners.size).toBe(0)
    expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(7)
    expect(JSON.stringify(output.mock.calls)).not.toContain("secret")
    expect(JSON.stringify(output.mock.calls)).not.toContain("private.example")
  })
})
