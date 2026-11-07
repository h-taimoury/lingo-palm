"use client"

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { LoaderCircle, MoreHorizontal, SlidersHorizontal } from "lucide-react"
import { LearningModal } from "@/components/video-player/learning/LearningModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { apiClient } from "@/lib/api/client"
import type { TaughtSense } from "@/types/api/courses"
import type { SenseLevel } from "@/types/api/dictionary"
import type { VocabularyBulkActionRequest, VocabularyBulkActionResponse } from "@/types/api/vocabulary"

type NewAction = "set_learned" | "set_already_known"
const PAGE_SIZE = 20

export function SectionVocabularyManager({ taughtSenses }: { taughtSenses: TaughtSense[] }) {
  const [detailItem, setDetailItem] = useState<TaughtSense | null>(null)
  const [items, setItems] = useState(taughtSenses)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [busy, setBusy] = useState<NewAction | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [newPage, setNewPage] = useState(1)
  const [learnedPage, setLearnedPage] = useState(1)
  const [level, setLevel] = useState<SenseLevel | "all">("all")
  const [showShortTranslation, setShowShortTranslation] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsId = useId()
  const controlsRef = useRef<HTMLDivElement>(null)
  const newSensesRef = useRef<HTMLDivElement>(null)
  const fresh = useMemo(() => items.filter((item) => !item.is_learned && (level === "all" || item.sense.level === level)), [items, level])
  const learned = useMemo(() => items.filter((item) => item.is_learned), [items])
  const currentNewPage = Math.min(newPage, Math.max(1, Math.ceil(fresh.length / PAGE_SIZE)))
  const currentLearnedPage = Math.min(learnedPage, Math.max(1, Math.ceil(learned.length / PAGE_SIZE)))
  const visibleFresh = fresh.slice((currentNewPage - 1) * PAGE_SIZE, currentNewPage * PAGE_SIZE)
  const visibleLearned = learned.slice((currentLearnedPage - 1) * PAGE_SIZE, currentLearnedPage * PAGE_SIZE)

  function changeNewPage(page: number) {
    setNewPage(page)
    requestAnimationFrame(() => {
      const controls = controlsRef.current
      const cards = newSensesRef.current
      if (!controls || !cards) return
      const stickyTop = Number.parseFloat(getComputedStyle(controls).top) || 0
      window.scrollTo({
        top: window.scrollY + cards.getBoundingClientRect().top - controls.getBoundingClientRect().height - stickyTop - 16,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      })
    })
  }

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

  function detailsButton(item: TaughtSense) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-3 top-3 size-8 rounded-full hover:bg-accent"
        aria-label={`View details for ${item.sense.entry.word}, sense ${item.sense.sense_number ?? item.sense.id}`}
        aria-haspopup="dialog"
        onClick={() => setDetailItem(item)}
      >
        <MoreHorizontal aria-hidden="true" />
      </Button>
    )
  }

  return (
    <div className="space-y-10">
      <section>
        <div>
            <h2 className="text-xl font-semibold">New senses</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose senses, then tell LingoPalm whether you learned them here or already knew them.</p>
            <p className="mt-1 text-sm text-muted-foreground">Know most of a level? Select all, unselect unfamiliar senses, then choose Already knew.</p>
        </div>
        <div ref={controlsRef} className="sticky top-[calc(4rem+1px)] z-20 mt-4 flex flex-wrap items-end justify-between gap-4 border-b bg-background py-4">
          <div className="flex items-center gap-10">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`size-9 rounded-full border transition-colors ${showControls ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" : "border-border text-muted-foreground hover:bg-accent"}`}
              aria-label={showControls ? "Hide controls" : "Show controls"}
              title={showControls ? "Hide controls" : "Show controls"}
              aria-expanded={showControls}
              aria-controls={controlsId}
              onClick={() => setShowControls((visible) => !visible)}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </Button>
            <p className="text-sm tabular-nums text-muted-foreground" role="status">{selected.size} selected across all pages</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!selected.size || busy !== null} onClick={() => void run("set_already_known")}>
              {busy === "set_already_known" ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Already knew
            </Button>
            <Button disabled={!selected.size || busy !== null} onClick={() => void run("set_learned")}>
              {busy === "set_learned" ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Mark learned
            </Button>
          </div>
          <div id={controlsId} hidden={!showControls} className={`${showControls ? "flex" : "hidden"} w-full flex-wrap items-center gap-x-8 gap-y-4`}>
            <label className="flex items-center gap-3 text-sm font-medium">
              Level
              <select
                value={level}
                disabled={busy !== null}
                onChange={(event) => {
                  setLevel(event.target.value as SenseLevel | "all")
                  setSelected(new Set())
                  setNewPage(1)
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="all">All levels</option>
                <option value="A">Beginner</option>
                <option value="B">Intermediate</option>
                <option value="C">Advanced</option>
              </select>
            </label>
            <Button type="button" variant="outline" size="sm" disabled={busy !== null || !fresh.length || selected.size === fresh.length} onClick={() => setSelected(new Set(fresh.map((item) => item.sense.id)))}>
              Select all ({fresh.length})
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy !== null || !selected.size} onClick={() => setSelected(new Set())}>
              Unselect all
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showShortTranslation}
                onChange={(event) => setShowShortTranslation(event.target.checked)}
                className="size-4 cursor-pointer accent-primary"
              />
              Show short translation
            </label>
          </div>
        </div>
        <div className="mt-4"><ApiErrorMessage error={error} /></div>
        {fresh.length ? (
          <div ref={newSensesRef} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFresh.map((item) => (
              <SenseCard
                key={item.sense.id}
                item={item}
                selected={selected.has(item.sense.id)}
                disabled={busy !== null}
                showShortTranslation={showShortTranslation}
                onToggle={() => setSelected((current) => {
                  const next = new Set(current)
                  if (next.has(item.sense.id)) next.delete(item.sense.id)
                  else next.add(item.sense.id)
                  return next
                })}
                details={detailsButton(item)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">{level === "all" ? "You have learned every sense taught in this section." : "No new senses at this level."}</p>
        )}
        {fresh.length > 0 ? (
          <div className="sticky bottom-0 z-20 mt-4 border-t bg-background py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SensePagination label="New senses" page={currentNewPage} count={fresh.length} onPageChange={changeNewPage} className="w-full" />
          </div>
        ) : null}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Already learned</h2>
        <p className="mt-1 text-sm text-muted-foreground">Current saved state from your vocabulary.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {learned.length ? visibleLearned.map((item) => (
            <SenseCard key={item.sense.id} item={item} details={detailsButton(item)} />
          )) : (
            <p className="rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">Nothing learned here yet.</p>
          )}
        </div>
        <SensePagination label="Already learned" page={currentLearnedPage} count={learned.length} onPageChange={setLearnedPage} />
      </section>
      {detailItem ? (
        <LearningModal
          presentation="section-vocabulary"
          items={[{ mappingId: detailItem.sense.id, mappingLabel: detailItem.sense.entry.word, sense: detailItem.sense }]}
          activeIndex={0}
          learnedSenseIds={new Set(detailItem.is_learned ? [detailItem.sense.id] : [])}
          knownSenseIds={new Set(detailItem.already_known ? [detailItem.sense.id] : [])}
          onClose={() => setDetailItem(null)}
        />
      ) : null}
    </div>
  )
}

function SensePagination({ label, page, count, onPageChange, className = "mt-5" }: {
  label: string
  page: number
  count: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (count === 0) return null
  const pages = Math.ceil(count / PAGE_SIZE)
  return (
    <nav aria-label={`${label} pagination`} className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div className="grid shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">
          {count}{"\u2013"}{count} of {count} senses
          {pages > 1 ? ` \u00b7 Page ${pages} of ${pages}` : ""}
        </span>
        <p className="col-start-1 row-start-1" role="status">
          {(page - 1) * PAGE_SIZE + 1}{"\u2013"}{Math.min(page * PAGE_SIZE, count)} of {count} senses
          {pages > 1 ? ` \u00b7 Page ${page} of ${pages}` : ""}
        </p>
      </div>
      {pages > 1 ? <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <Button type="button" variant="outline" size="sm" disabled={page === pages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div> : null}
    </nav>
  )
}

function SenseCard({ item, selected = false, disabled = false, showShortTranslation = false, onToggle, details }: {
  item: TaughtSense
  selected?: boolean
  disabled?: boolean
  showShortTranslation?: boolean
  onToggle?: () => void
  details: ReactNode
}) {
  const { sense } = item
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const definitionRef = useRef<HTMLParagraphElement>(null)
  const definitionId = useId()

  useEffect(() => {
    const element = definitionRef.current
    if (!element || expanded) return
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [sense.definition, sense.lex_unit, expanded])

  const heading = (
    <span className="block min-w-0 truncate leading-6" title={`${sense.entry.word} ${sense.entry.part_of_speech}${sense.sense_number != null ? ` - Sense ${sense.sense_number}` : ""}`}>
      <strong>{sense.entry.word}</strong>{" "}
      <span className="text-sm italic text-muted-foreground">{sense.entry.part_of_speech}</span>{" "}
      {sense.sense_number != null ? <span className="text-xs text-muted-foreground">Sense {sense.sense_number}</span> : null}
    </span>
  )

  return (
    <article className={`relative min-w-0 ${item.is_learned || showShortTranslation ? "h-48" : "h-40"} ${expanded ? "z-10" : ""}`}>
      <div className={`absolute inset-x-0 top-0 min-h-full rounded-xl border bg-card p-4 ${expanded ? "shadow-xl" : "shadow-sm"} ${selected ? "border-primary ring-1 ring-primary" : ""}`}>
        <div className="pr-8">
          {onToggle ? (
            <label className={`flex min-w-0 items-center gap-2 ${disabled ? "cursor-wait" : "cursor-pointer"}`}>
              <input type="checkbox" checked={selected} disabled={disabled} onChange={onToggle} className="size-4 shrink-0 cursor-inherit accent-primary" />
              {heading}
            </label>
          ) : heading}
        </div>
        {details}
        {showShortTranslation ? (
          <p dir="auto" className="mt-2 h-6 truncate text-sm leading-6 text-muted-foreground" title={sense.short_translation?.trim() || undefined}>
            {sense.short_translation?.trim()}
          </p>
        ) : null}
        <div className={`mt-2 ${expanded ? "" : "h-[4.5rem]"}`}>
          <p ref={definitionRef} id={definitionId} className={`break-words text-sm leading-6 ${expanded ? "" : "line-clamp-3"}`}>
            {sense.lex_unit?.trim() ? <><span className="rounded bg-primary/10 px-1 py-0.5 font-medium text-primary">{sense.lex_unit}</span>{" "}</> : null}
            {sense.definition}
          </p>
        </div>
        <div className="h-5">
          {overflows ? (
            <button type="button" aria-expanded={expanded} aria-controls={definitionId} onClick={() => setExpanded(!expanded)} className="cursor-pointer rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {expanded ? "Show less" : "Show more..."}
            </button>
          ) : null}
        </div>
        {item.is_learned ? <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">{item.already_known ? "Already knew" : "Learned"}</Badge>
          {item.needs_review ? <Badge variant="secondary">Needs review</Badge> : null}
        </div> : null}
      </div>
    </article>
  )
}
