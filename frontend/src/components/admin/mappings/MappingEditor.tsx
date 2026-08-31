"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { GripHorizontal, LoaderCircle, Search, Trash2, X } from "lucide-react"
import toast from "react-hot-toast"

import { AdminVideoPreview } from "@/components/admin/mappings/AdminVideoPreview"
import { mappingColor } from "@/components/admin/mappings/mappingStyles"
import { useUnsavedChangesWarning } from "@/components/admin/mappings/useUnsavedChangesWarning"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import { publicEnv } from "@/lib/env"
import {
  buildSubtitleMappingIndex,
  createSubtitleTokenKey,
  loadVtt,
  tokenToSubtitleWordInput,
} from "@/lib/subtitles"
import { cn } from "@/lib/utils"
import type { PaginatedResponse } from "@/types/api/common"
import type {
  CreateSubtitleWordRequest,
  CreateWordSenseMappingRequest,
  SectionDetail,
  SubtitleWord,
  UpdateWordSenseMappingRequest,
  WordSenseMapping,
} from "@/types/api/courses"
import type { Sense, SenseSummary } from "@/types/api/dictionary"
import type { ScrapeRequest, ScrapeResponse } from "@/types/api/scraper"
import type { SubtitleCue, SubtitleToken } from "@/types/subtitles"

function wordKey(word: SubtitleWord) {
  return createSubtitleTokenKey({
    cueId: word.cue_id,
    word: word.word,
    positionInCue: word.position_in_cue,
  })
}

function sameSet(a: Set<string>, b: Set<string>) {
  return a.size === b.size && [...a].every((item) => b.has(item))
}

function sameIds(a: Map<number, SenseSummary>, ids: number[]) {
  return a.size === ids.length && ids.every((id) => a.has(id))
}

type TrayDragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  startLeft: number
  startRight: number
  startTop: number
  startBottom: number
}

export function MappingEditor({ section }: { section: SectionDetail }) {
  const [cues, setCues] = useState<SubtitleCue[]>([])
  const [mappings, setMappings] = useState(section.word_sense_mappings)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [selectedSenses, setSelectedSenses] = useState<Map<number, SenseSummary>>(
    () => new Map(),
  )
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false)

  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Sense[]>([])
  const [searching, setSearching] = useState(false)

  const [scrapeWord, setScrapeWord] = useState("")
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<unknown>(null)

  const [trayOffset, setTrayOffset] = useState({ x: 0, y: 0 })
  const [trayDragging, setTrayDragging] = useState(false)
  const trayRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<TrayDragState | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    void loadVtt(section.subtitle_file, abort.signal)
      .then((parsed) => {
        setCues(parsed.cues)
        setLoadError(null)
      })
      .catch((error) => {
        if (!abort.signal.aborted) setLoadError(error)
      })
    return () => abort.abort()
  }, [section.subtitle_file])

  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    const abort = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      void apiClient
        .get<PaginatedResponse<Sense>>(
          `/api/dictionary/senses/?search=${encodeURIComponent(query)}&page=1`,
          { signal: abort.signal },
        )
        .then((data) => setResults(data.results))
        .catch((error) => {
          if (!abort.signal.aborted) setActionError(error)
        })
        .finally(() => {
          if (!abort.signal.aborted) setSearching(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timer)
      abort.abort()
    }
  }, [search])

  const active = mappings.find((mapping) => mapping.id === activeId) ?? null
  const originalKeys = useMemo(
    () => new Set(active?.subtitle_words.map(wordKey) ?? []),
    [active],
  )
  const originalSenseIds = useMemo(
    () => active?.senses.map((sense) => sense.id) ?? [],
    [active],
  )
  const dirty = active
    ? !sameSet(selectedKeys, originalKeys) || !sameIds(selectedSenses, originalSenseIds)
    : selectedKeys.size > 0 || selectedSenses.size > 0

  useUnsavedChangesWarning(dirty)

  const mappingIndexResult = useMemo(() => {
    try {
      return { index: buildSubtitleMappingIndex(mappings), error: null as unknown }
    } catch (error) {
      return { index: new Map<string, WordSenseMapping>(), error }
    }
  }, [mappings])

  const mappingIndex = mappingIndexResult.index
  const effectiveLoadError = loadError ?? mappingIndexResult.error

  const tokenLookup = useMemo(() => {
    const map = new Map<string, { token: SubtitleToken; cue: SubtitleCue }>()
    cues.forEach((cue) =>
      cue.tokens.forEach((token) => map.set(token.key, { token, cue })),
    )
    return map
  }, [cues])

  const selectedOccurrences = useMemo(() => {
    return [...selectedKeys]
      .map((key) => tokenLookup.get(key))
      .filter((item): item is { token: SubtitleToken; cue: SubtitleCue } => Boolean(item))
      .sort((a, b) => a.cue.cueId - b.cue.cueId || a.token.index - b.token.index)
  }, [selectedKeys, tokenLookup])

  function resetWorking() {
    setActiveId(null)
    setSelectedKeys(new Set())
    setSelectedSenses(new Map())
    setSearch("")
    setResults([])
    setActionError(null)
    setMappingDialogOpen(false)
    setScrapeWord("")
    setScrapeError(null)
    setTrayOffset({ x: 0, y: 0 })
    setTrayDragging(false)
    dragRef.current = null
  }

  function openMapping(mapping: WordSenseMapping) {
    if (dirty && activeId !== mapping.id && !window.confirm("Discard your current unsaved mapping changes?")) {
      return
    }

    setActiveId(mapping.id)
    setSelectedKeys(new Set(mapping.subtitle_words.map(wordKey)))
    setSelectedSenses(new Map(mapping.senses.map((sense) => [sense.id, sense])))
    setSearch("")
    setResults([])
    setActionError(null)
    setScrapeWord("")
    setScrapeError(null)
    setTrayOffset({ x: 0, y: 0 })
    setMappingDialogOpen(true)
  }

  function clickToken(token: SubtitleToken) {
    const existing = mappingIndex.get(token.key)
    if (existing && existing.id !== activeId) {
      openMapping(existing)
      return
    }

    setSelectedKeys((current) => {
      const next = new Set(current)
      next.has(token.key) ? next.delete(token.key) : next.add(token.key)
      return next
    })
  }

  function removeSelectedKey(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      next.delete(key)
      return next
    })
  }

  function toggleSense(sense: SenseSummary) {
    setSelectedSenses((current) => {
      const next = new Map(current)
      next.has(sense.id) ? next.delete(sense.id) : next.set(sense.id, sense)
      return next
    })
  }

  function handleTrayPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0) return

    const tray = trayRef.current
    if (!tray) return

    const rect = tray.getBoundingClientRect()

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: trayOffset.x,
      originY: trayOffset.y,
      startLeft: rect.left,
      startRight: rect.right,
      startTop: rect.top,
      startBottom: rect.bottom,
    }

    setTrayDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleTrayPointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const viewportPadding = 8
    const rawDeltaX = event.clientX - drag.startX
    const rawDeltaY = event.clientY - drag.startY

    const minimumDeltaX = viewportPadding - drag.startLeft
    const maximumDeltaX =
      window.innerWidth - viewportPadding - drag.startRight
    const minimumDeltaY = viewportPadding - drag.startTop
    const maximumDeltaY =
      window.innerHeight - viewportPadding - drag.startBottom

    const deltaX = Math.min(
      maximumDeltaX,
      Math.max(minimumDeltaX, rawDeltaX),
    )
    const deltaY = Math.min(
      maximumDeltaY,
      Math.max(minimumDeltaY, rawDeltaY),
    )

    setTrayOffset({
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    })
  }

  function finishTrayDrag(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    setTrayDragging(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  async function reload() {
    const fresh = await apiClient.get<SectionDetail>(
      `/api/courses/sections/${section.id}/`,
    )
    setMappings(fresh.word_sense_mappings)
    return fresh.word_sense_mappings
  }

  async function save() {
    if (!selectedKeys.size) {
      setActionError(new Error("Select at least one subtitle occurrence."))
      return
    }
    if (!selectedSenses.size) {
      setActionError(new Error("Select at least one dictionary sense."))
      return
    }

    setBusy(true)
    setActionError(null)

    try {
      if (!active) {
        const subtitleWords = [...selectedKeys].map((key) => {
          const found = tokenLookup.get(key)
          if (!found) throw new Error("A selected subtitle token no longer exists.")
          return tokenToSubtitleWordInput(found.token, found.cue)
        })
        const payload: CreateWordSenseMappingRequest = {
          section: section.id,
          senses: [...selectedSenses.keys()],
          subtitle_words: subtitleWords,
        }
        await apiClient.post<WordSenseMapping, CreateWordSenseMappingRequest>(
          "/api/courses/word-sense-mappings/",
          payload,
        )
      } else {
        if (!sameIds(selectedSenses, originalSenseIds)) {
          const payload: UpdateWordSenseMappingRequest = {
            sense_ids: [...selectedSenses.keys()],
          }
          await apiClient.patch(
            `/api/courses/word-sense-mappings/${active.id}/`,
            payload,
          )
        }

        const originalByKey = new Map(
          active.subtitle_words.map((word) => [wordKey(word), word]),
        )

        for (const key of selectedKeys) {
          if (originalByKey.has(key)) continue
          const found = tokenLookup.get(key)
          if (!found) throw new Error("A selected subtitle token no longer exists.")
          const body: CreateSubtitleWordRequest = {
            mapping: active.id,
            ...tokenToSubtitleWordInput(found.token, found.cue),
          }
          await apiClient.post("/api/courses/subtitle-words/", body)
        }

        for (const [key, word] of originalByKey) {
          if (!selectedKeys.has(key)) {
            await apiClient.delete(`/api/courses/subtitle-words/${word.id}/`)
          }
        }
      }

      await reload()
      resetWorking()
    } catch (error) {
      let freshMappings: WordSenseMapping[] | null = null
      try {
        freshMappings = await reload()
      } catch {
        // Keep the original mutation error.
      }

      setActionError(
        new Error(
          active
            ? `Some mapping changes may already have been saved. The editor reloaded Django's current state. ${error instanceof Error ? error.message : ""}`
            : error instanceof Error
              ? error.message
              : "Unable to create mapping.",
        ),
      )

      if (activeId && freshMappings) {
        const current = freshMappings.find((mapping) => mapping.id === activeId)
        if (current) {
          setActiveId(current.id)
          setSelectedKeys(new Set(current.subtitle_words.map(wordKey)))
          setSelectedSenses(new Map(current.senses.map((sense) => [sense.id, sense])))
          setSearch("")
          setResults([])
        } else {
          resetWorking()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function deleteMapping() {
    if (!active || !window.confirm("Delete this mapping and all of its subtitle occurrences?")) {
      return
    }

    setBusy(true)
    setActionError(null)
    try {
      await apiClient.delete(`/api/courses/word-sense-mappings/${active.id}/`)
      await reload()
      resetWorking()
    } catch (error) {
      setActionError(error)
    } finally {
      setBusy(false)
    }
  }

  async function scrapeSelectedWord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const word = scrapeWord.trim()
    if (!word) return

    setScraping(true)
    setScrapeError(null)

    try {
      await apiClient.post<ScrapeResponse, ScrapeRequest>(
        "/api/scraper/scrape/",
        { word },
      )

      toast.success(`"${word}" was scraped successfully.`)
      setScrapeWord("")
      setSearch(word)
    } catch (error) {
      setScrapeError(error)
    } finally {
      setScraping(false)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4">
          <h3 className="font-semibold">Select while watching</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Play the section normally. Every word in the current subtitle cue is clickable for admins.
            Your selection is shared with the transcript below.
          </p>
        </div>
        <AdminVideoPreview
          source={section.video_url}
          cues={cues}
          mappingIndex={mappingIndex}
          selectedKeys={selectedKeys}
          activeMappingId={activeId}
          onTokenClick={clickToken}
          onMappedTokenClick={openMapping}
        />
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h3 className="font-semibold">Select from the full transcript</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This is the original selection method. Read all cues and click/tap exact occurrences.
            Selection may span cues. Clicking an already mapped occurrence opens that mapping.
          </p>
        </div>

        <div className="max-h-[720px] space-y-4 overflow-y-auto p-4">
          {effectiveLoadError ? (
            <ApiErrorMessage error={effectiveLoadError} />
          ) : (
            cues.map((cue) => (
              <div key={cue.cueId} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Cue {cue.cueId}</span>
                  <span>
                    {cue.startTime.toFixed(2)}–{cue.endTime.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-1.5 gap-y-2 leading-8">
                  {cue.tokens.map((token) => {
                    const mapped = mappingIndex.get(token.key)
                    const selected = selectedKeys.has(token.key)
                    const belongsActive = mapped?.id === activeId

                    return (
                      <button
                        key={token.key}
                        type="button"
                        onClick={() => clickToken(token)}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-sm ring-1 ring-inset transition",
                          mapped
                            ? mappingColor(mapped.id)
                            : selected
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "bg-muted/60 ring-border hover:bg-accent",
                          belongsActive && "ring-2 ring-foreground",
                        )}
                        aria-pressed={selected || belongsActive}
                      >
                        {token.word}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {mappings.length ? (
        <section>
          <p className="mb-2 text-sm font-medium">Existing mappings</p>
          <div className="flex flex-wrap gap-2">
            {mappings.map((mapping) => (
              <button
                key={mapping.id}
                type="button"
                onClick={() => openMapping(mapping)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
                  mappingColor(mapping.id),
                )}
              >
                #{mapping.id} · {mapping.senses[0]?.entry.word ?? "mapping"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedKeys.size > 0 && !mappingDialogOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div
            ref={trayRef}
            className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-background/95 shadow-2xl backdrop-blur"
            style={{
              transform: `translate3d(${trayOffset.x}px, ${trayOffset.y}px, 0)`,
            }}
          >
            <div
              className={cn(
                "flex touch-none select-none items-center justify-center border-b bg-muted/50 py-1.5 text-muted-foreground transition-colors hover:bg-muted",
                trayDragging ? "cursor-grabbing" : "cursor-grab",
              )}
              onPointerDown={handleTrayPointerDown}
              onPointerMove={handleTrayPointerMove}
              onPointerUp={finishTrayDrag}
              onPointerCancel={finishTrayDrag}
              aria-label="Drag selected words box"
              title="Drag to move"
            >
              <GripHorizontal className="size-5" />
              <span className="ml-2 text-[11px] font-medium">Drag to move</span>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {active
                      ? `Editing mapping #${active.id}`
                      : `${selectedKeys.size} selected word${selectedKeys.size === 1 ? "" : "s"}`}
                  </p>
                  <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                    {selectedOccurrences.map(({ token, cue }) => (
                      <button
                        key={token.key}
                        type="button"
                        onClick={() => removeSelectedKey(token.key)}
                        className="rounded-full border bg-muted px-2.5 py-1 text-xs hover:bg-accent"
                        title="Remove from selection"
                      >
                        {token.word}{" "}
                        <span className="text-muted-foreground">
                          · cue {cue.cueId}
                        </span>{" "}
                        ×
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetWorking}
                  aria-label="Clear selected words"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="mt-3 flex justify-end">
                <Button onClick={() => setMappingDialogOpen(true)}>
                  {active
                    ? "Edit mapping"
                    : `Map ${selectedKeys.size} selected word${selectedKeys.size === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mappingDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMappingDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mapping-dialog-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-background shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {active ? `Editing mapping #${active.id}` : "New mapping"}
                </p>
                <h3 id="mapping-dialog-title" className="mt-1 text-xl font-semibold">
                  Map selected subtitle words
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMappingDialogOpen(false)}
                aria-label="Close mapping dialog"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-6 p-5">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold">Selected subtitle occurrences</h4>
                  <span className="text-xs text-muted-foreground">{selectedKeys.size} selected</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedOccurrences.map(({ token, cue }) => (
                    <button
                      key={token.key}
                      type="button"
                      onClick={() => removeSelectedKey(token.key)}
                      className="rounded-full border bg-muted px-2.5 py-1 text-xs hover:bg-accent"
                    >
                      {token.word} <span className="text-muted-foreground">· cue {cue.cueId}</span> ×
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold">Selected dictionary senses</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...selectedSenses.values()].map((sense) => (
                    <button
                      key={sense.id}
                      type="button"
                      onClick={() => toggleSense(sense)}
                      className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                    >
                      {sense.entry.word}: {sense.title} ×
                    </button>
                  ))}
                  {!selectedSenses.size ? (
                    <p className="text-sm text-muted-foreground">No senses selected yet.</p>
                  ) : null}
                </div>
              </section>

              <section>
                <Label htmlFor="sense-search">Search database senses</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sense-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9"
                    placeholder="word, title, definition…"
                  />
                </div>
                {search.trim().length === 1 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Type at least 2 characters.</p>
                ) : null}

                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {searching ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" /> Searching…
                    </p>
                  ) : (
                    results.map((sense) => (
                      <button
                        type="button"
                        key={sense.id}
                        onClick={() => toggleSense(sense)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left text-sm",
                          selectedSenses.has(sense.id) && "border-primary bg-primary/5",
                        )}
                      >
                        <span className="font-medium">{sense.entry.word}</span>{" "}
                        <span className="italic text-muted-foreground">
                          {sense.entry.part_of_speech}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">{sense.title}</span>
                        {sense.lex_unit ? (
                          <span className="mt-1 block text-sm italic text-blue-600">
                            {sense.lex_unit}
                          </span>
                        ) : null}
                        <span className="mt-1 block line-clamp-2">{sense.definition}</span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              {publicEnv.enableScraper ? (
                <section className="rounded-xl border bg-muted/30 p-4">
                  <h4 className="font-semibold">Word missing from the dictionary?</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Scrape it here without leaving the section editor. Scraped entries are saved to Django immediately.
                  </p>
                  <form onSubmit={scrapeSelectedWord} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={scrapeWord}
                      onChange={(event) => setScrapeWord(event.target.value)}
                      placeholder="Word to scrape"
                      required
                    />
                    <Button type="submit" disabled={scraping}>
                      {scraping ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      {scraping ? "Scraping…" : "Scrape word"}
                    </Button>
                  </form>
                  <div className="mt-3">
                    <ApiErrorMessage error={scrapeError} />
                  </div>
                </section>
              ) : null}

              <ApiErrorMessage error={actionError} />
            </div>

            <div className="sticky bottom-0 flex flex-wrap justify-between gap-3 border-t bg-background p-5">
              <div>
                {active ? (
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void deleteMapping()}
                  >
                    <Trash2 className="size-4" /> Delete mapping
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
                  Keep selecting
                </Button>
                <Button
                  disabled={busy || !selectedKeys.size || !selectedSenses.size}
                  onClick={() => void save()}
                >
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  {active ? "Save mapping" : "Create mapping"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
