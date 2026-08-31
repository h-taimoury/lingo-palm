"use client"

import { useEffect } from "react"

import type { LearningModalMode } from "@/types/player"

type KeyboardController = {
  togglePlay: () => void
  seekBy: (seconds: number) => void
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

    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreAllShortcuts(event.target)) {
        return
      }

      const key = event.key.toLowerCase()
      const isNativeActionTarget = isButtonOrLink(event.target)

      if (controller.modalMode !== "closed") {
        if (key === "enter") {
          if (isNativeActionTarget) {
            return
          }

          event.preventDefault()
          controller.closeModal()
        } else if (key === "arrowleft") {
          event.preventDefault()
          controller.previousSense()
        } else if (key === "arrowright") {
          event.preventDefault()
          controller.nextSense()
        }

        return
      }

      if (isNativeActionTarget && (key === "enter" || key === " ")) {
        return
      }

      if (
        key === "enter" ||
        key === " " ||
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
        case "enter":
          controller.openCueModal()
          break
        case " ":
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

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
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

function isButtonOrLink(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("button, a"))
  )
}
