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
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={index <= 0}
        onClick={onPrevious}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Previous
      </button>

      <span className="text-sm tabular-nums text-muted-foreground">
        {count === 0 ? "0 / 0" : `${index + 1} / ${count}`}
      </span>

      <button
        type="button"
        disabled={index >= count - 1}
        onClick={onNext}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
      >
        Next
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
