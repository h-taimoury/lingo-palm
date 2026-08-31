"use client"

import { useEffect } from "react"

export function useUnsavedChangesWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    const click = (event: MouseEvent) => { const target = event.target instanceof Element ? event.target.closest("a[href]") as HTMLAnchorElement | null : null; if (!target || target.target === "_blank" || target.origin !== window.location.origin) return; if (!window.confirm("Discard your unsaved mapping changes?")) { event.preventDefault(); event.stopPropagation() } }
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", click, true)
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true) }
  }, [enabled])
}
