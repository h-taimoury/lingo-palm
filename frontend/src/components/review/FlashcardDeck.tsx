"use client"

import { useState } from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { apiClient } from "@/lib/api/client"
import type { Vocabulary, VocabularyBulkActionRequest, VocabularyBulkActionResponse } from "@/types/api/vocabulary"

export function FlashcardDeck({ initialRows }: { initialRows: Vocabulary[] }) {
  const [rows, setRows] = useState(initialRows); const [index, setIndex] = useState(0); const [flipped, setFlipped] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null)
  if (!rows.length) return <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Your review queue is empty.</p>
  const safeIndex = Math.min(index, rows.length - 1); const row = rows[safeIndex]!
  async function markReviewed() { setBusy(true); setError(null); try { const payload: VocabularyBulkActionRequest = { action: "unset_needs_review", sense_ids: [row.sense.id] }; await apiClient.post<VocabularyBulkActionResponse, VocabularyBulkActionRequest>("/api/my-vocabulary/vocabulary/bulk-action/", payload); setRows((current) => current.filter((item) => item.id !== row.id)); setIndex((current) => Math.max(0, Math.min(current, rows.length - 2))); setFlipped(false) } catch (caught) { setError(caught) } finally { setBusy(false) } }
  return <div><ApiErrorMessage error={error} /><button type="button" onClick={() => setFlipped((v) => !v)} className="mt-4 flex min-h-80 w-full flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center shadow-sm transition hover:bg-accent/20">{flipped ? <><p className="text-2xl font-semibold">{row.sense.entry.word}</p><p className="mt-5 max-w-2xl text-lg leading-8">{row.sense.definition}</p><p className="mt-8 text-sm text-muted-foreground">Click to see the word side</p></> : <><p className="text-xs uppercase tracking-wide text-muted-foreground">{row.sense.sense_number ? `Sense ${row.sense.sense_number}` : "Vocabulary sense"}</p><p className="mt-3 text-4xl font-semibold">{row.sense.entry.word}</p><p className="mt-2 italic text-muted-foreground">{row.sense.entry.part_of_speech}</p><p className="mt-8 text-sm text-muted-foreground">Click to reveal the definition</p></>}</button><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={safeIndex === 0 || busy} onClick={() => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false) }}>Previous</Button><span className="text-sm text-muted-foreground">{safeIndex + 1} / {rows.length}</span><div className="flex gap-2"><Button variant="outline" disabled={safeIndex >= rows.length - 1 || busy} onClick={() => { setIndex((i) => Math.min(rows.length - 1, i + 1)); setFlipped(false) }}>Next</Button><Button disabled={busy} onClick={() => void markReviewed()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Reviewed</Button></div></div></div>
}
