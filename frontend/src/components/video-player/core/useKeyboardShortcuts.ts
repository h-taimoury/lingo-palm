"use client"

import { useEffect } from "react"

import type { LearningModalMode } from "@/types/player"

type KeyboardController = {
  togglePlay: () => void
  seekBy: (seconds: number) => void
  adjustVolume: (amount: number) => void
  toggleMute: () => void
  toggleFullscreen: () => Promise<void>
  toggleTheater: () => void

  modalMode: LearningModalMode
  openCueModal: () => void
  closeModal: () => void
  previousSense: () => void
  nextSense: () => void
}

type UseKeyboardShortcutsOptions = {
  enabled: boolean
  controller: KeyboardController
}

const KEYBOARD_SEEK_SECONDS = 5

export function useKeyboardShortcuts({
  enabled,
  controller,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    // Handle player actions before focused buttons, sliders, or menus consume them.
    function onPlayerKeyDown(event: KeyboardEvent) {
      if (event.isComposing || isTypingTarget(event.target)) return
      const key = event.key
      if (!["Enter", " ", "ArrowUp", "ArrowDown"].includes(key)) return
      if (key === " " && controller.modalMode !== "closed") return

      event.preventDefault()
      event.stopPropagation()
      if (key === "ArrowUp" || key === "ArrowDown") {
        controller.adjustVolume(key === "ArrowUp" ? 0.05 : -0.05)
        return
      }
      if (event.repeat) return
      if (key === " ") controller.togglePlay()
      else if (controller.modalMode === "closed") controller.openCueModal()
      else controller.closeModal()
    }

    function onPlayerKeyUp(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      if (event.key === "Enter" || (event.key === " " && controller.modalMode === "closed")) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreAllShortcuts(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if (controller.modalMode !== "closed") {
        if (key === "arrowleft") {
          event.preventDefault()
          controller.previousSense()
        } else if (key === "arrowright") {
          event.preventDefault()
          controller.nextSense()
        }

        return
      }


      if (
        key === "k" ||
        key === "j" ||
        key === "l" ||
        key === "arrowleft" ||
        key === "arrowright" ||
        key === "m" ||
        key === "f" ||
        key === "t"
      ) {
        event.preventDefault()
      }

      switch (key) {
        case "k":
          controller.togglePlay()
          break
        case "j":
        case "arrowleft":
          controller.seekBy(-KEYBOARD_SEEK_SECONDS)
          break
        case "l":
        case "arrowright":
          controller.seekBy(KEYBOARD_SEEK_SECONDS)
          break
        case "m":
          controller.toggleMute()
          break
        case "f":
          void controller.toggleFullscreen()
          break
        case "t":
          controller.toggleTheater()
          break
      }
    }

    window.addEventListener("keydown", onPlayerKeyDown, true)
    window.addEventListener("keyup", onPlayerKeyUp, true)
    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onPlayerKeyDown, true)
      window.removeEventListener("keyup", onPlayerKeyUp, true)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [controller, enabled])
}

function shouldIgnoreAllShortcuts(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target.closest("textarea, [role='textbox']")) return true
  return target.tagName === "INPUT" && !["range", "button", "checkbox", "radio", "submit", "reset"].includes((target as HTMLInputElement).type)
}
