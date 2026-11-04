import { afterEach, expect, it, vi } from "vitest"
import type { LearningModalMode } from "@/types/player"

const harness = vi.hoisted(() => ({ effect: null as null | (() => void | (() => void)) }))
vi.mock("react", () => ({ useEffect: (effect: typeof harness.effect) => { harness.effect = effect } }))
import { useKeyboardShortcuts } from "./useKeyboardShortcuts"

class ElementStub {
  isContentEditable = false
  constructor(public tagName: string, public type = "") {}
  closest() { return null }
}

afterEach(() => vi.unstubAllGlobals())

it.each(["BUTTON", "range", "SELECT"])("handles focused %s controls before native actions", (control) => {
  const listeners = new Map<string, (event: KeyboardEvent) => void>()
  vi.stubGlobal("HTMLElement", ElementStub)
  vi.stubGlobal("window", {
    addEventListener: (type: string, handler: (event: KeyboardEvent) => void, capture = false) => listeners.set(`${type}-${capture}`, handler),
    removeEventListener: (type: string, _handler: unknown, capture = false) => listeners.delete(`${type}-${capture}`),
  })
  const controller = {
    modalMode: "closed" as LearningModalMode,
    togglePlay: vi.fn(), seekBy: vi.fn(), adjustVolume: vi.fn(), toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(), toggleTheater: vi.fn(), openCueModal: vi.fn(),
    closeModal: vi.fn(), previousSense: vi.fn(), nextSense: vi.fn(),
  }
  useKeyboardShortcuts({ enabled: true, controller })
  const cleanup = harness.effect!()
  const target = new ElementStub(control === "range" ? "INPUT" : control, control)
  function press(key: string, repeat = false, eventTarget = target) {
    const event = { key, repeat, target: eventTarget, preventDefault: vi.fn(), stopPropagation: vi.fn() }
    listeners.get("keydown-true")!(event as unknown as KeyboardEvent)
    return event
  }
  expect(press("Enter").preventDefault).toHaveBeenCalled()
  expect(controller.openCueModal).toHaveBeenCalledOnce()
  press("Enter", true)
  expect(controller.openCueModal).toHaveBeenCalledOnce()
  controller.modalMode = "cue"
  press("Enter")
  expect(controller.closeModal).toHaveBeenCalledOnce()
  expect(press(" ").preventDefault).not.toHaveBeenCalled()
  expect(controller.togglePlay).not.toHaveBeenCalled()
  controller.modalMode = "closed"
  press(" ")
  press(" ", true)
  expect(controller.togglePlay).toHaveBeenCalledOnce()
  press("ArrowUp")
  press("ArrowDown")
  expect(controller.adjustVolume.mock.calls).toEqual([[0.05], [-0.05]])
  expect(press("Enter", false, new ElementStub("INPUT", "text")).preventDefault).not.toHaveBeenCalled()
  cleanup?.()
  expect(listeners.size).toBe(0)
})
