"use client"

import { useMemo, useState } from "react"
import { Check, LoaderCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { apiClient } from "@/lib/api/client"
import type { TaughtSense } from "@/types/api/courses"
import type { VocabularyBulkActionRequest, VocabularyBulkActionResponse } from "@/types/api/vocabulary"

type NewAction = "set_learned" | "set_already_known"

export function SectionVocabularyManager({ taughtSenses }: { taughtSenses: TaughtSense[] }) {
  const [items, setItems] = useState(taughtSenses)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [busy, setBusy] = useState<NewAction | null>(null)
  const [error, setError] = useState<unknown>(null)
  const fresh = useMemo(() => items.filter((item) => !item.is_learned), [items])
  const learned = useMemo(() => items.filter((item) => item.is_learned), [items])

  async function run(action: NewAction) {
    if (!selected.size) return
    const ids = [...selected]; setBusy(action); setError(null)
    try {
      const payload: VocabularyBulkActionRequest = { action, sense_ids: ids }
      await apiClient.post<VocabularyBulkActionResponse, VocabularyBulkActionRequest>("/api/my-vocabulary/vocabulary/bulk-action/", payload)
      setItems((current) => current.map((item) => ids.includes(item.sense.id) ? { ...item, is_learned: true, already_known: action === "set_already_known", needs_review: action === "set_learned" } : item))
      setSelected(new Set())
    } catch (caught) { setError(caught) } finally { setBusy(null) }
  }

  return <div className="space-y-10"><section><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">New senses</h2><p className="mt-1 text-sm text-muted-foreground">Choose senses, then tell LingoPalm whether you learned them here or already knew them.</p></div><div className="flex gap-2"><Button variant="outline" disabled={!selected.size || busy !== null} onClick={() => void run("set_already_known")}>{busy === "set_already_known" ? <LoaderCircle className="size-4 animate-spin" /> : null}Already knew</Button><Button disabled={!selected.size || busy !== null} onClick={() => void run("set_learned")}>{busy === "set_learned" ? <LoaderCircle className="size-4 animate-spin" /> : null}Mark learned</Button></div></div><div className="mt-4"><ApiErrorMessage error={error} /></div>{fresh.length ? <div className="mt-4 grid gap-3">{fresh.map((item) => { const checked = selected.has(item.sense.id); return <button key={item.sense.id} type="button" aria-pressed={checked} onClick={() => setSelected((current) => { const next = new Set(current); checked ? next.delete(item.sense.id) : next.add(item.sense.id); return next })} className="flex gap-3 rounded-xl border bg-card p-4 text-left transition hover:bg-accent/30"><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>{checked ? <Check className="size-3.5" /> : null}</span><SenseSummary item={item} /></button> })}</div> : <p className="mt-4 rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">You have learned every sense taught in this section.</p>}</section><section><h2 className="text-xl font-semibold">Already learned</h2><p className="mt-1 text-sm text-muted-foreground">Current saved state from your vocabulary.</p><div className="mt-4 grid gap-3">{learned.length ? learned.map((item) => <div key={item.sense.id} className="rounded-xl border bg-card p-4"><SenseSummary item={item} /></div>) : <p className="rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">Nothing learned here yet.</p>}</div></section></div>
}

function SenseSummary({ item }: { item: TaughtSense }) { const sense = item.sense; return <div className="min-w-0"><div className="flex flex-wrap items-baseline gap-2"><strong>{sense.entry.word}</strong><span className="text-sm italic text-muted-foreground">{sense.entry.part_of_speech}</span>{sense.sense_number ? <span className="text-xs text-muted-foreground">Sense {sense.sense_number}</span> : null}</div><p className="mt-2 text-sm leading-6">{sense.definition}</p>{item.is_learned ? <div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">{item.already_known ? "Already knew" : "Learned"}</Badge>{item.needs_review ? <Badge variant="secondary">Needs review</Badge> : null}</div> : null}</div> }
