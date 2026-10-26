import type { EntrySummary } from "@/types/api/dictionary"

export function EntryVariant({ variant }: { variant: EntrySummary["variant"] }) {
  if (!variant?.word) return null
  return (
    <span className="ml-2 text-base">
      <span aria-hidden="true">, </span>
      <strong>{variant.word}</strong>
      {variant.pronunciation ? <span className="ml-1 font-[Arial] text-muted-foreground">{variant.pronunciation}</span> : null}
      {variant.region ? <span className="ml-1 text-blue-700 dark:text-blue-400">{variant.region}</span> : null}
    </span>
  )
}
