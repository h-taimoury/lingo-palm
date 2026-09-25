"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

type SenseNavigationProps = {
  index: number
  count: number
  onPrevious: () => void
  onNext: () => void
}

export function SenseNavigation({
  index,
  count,
  onPrevious,
  onNext,
}: SenseNavigationProps) {
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Sense navigation">
      <button
        type="button"
        disabled={index <= 0}
        onClick={onPrevious}
        aria-label="Previous sense"
        title="Previous sense (←)"
        aria-keyshortcuts="ArrowLeft"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        disabled={index >= count - 1}
        onClick={onNext}
        aria-label="Next sense"
        title="Next sense (→)"
        aria-keyshortcuts="ArrowRight"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
