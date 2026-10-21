"use client"

import { useRef, useState } from "react"
import { Copy, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { apiClient } from "@/lib/api/client"
import type { SectionDetail } from "@/types/api/courses"

export function CopySectionMappings({ sectionId }: { sectionId: number }) {
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState("")
  const [manualJson, setManualJson] = useState("")

  async function copyMappings() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError(null)
    setMessage("")
    setManualJson("")
    try {
      const section = await apiClient.get<SectionDetail>(`/api/courses/sections/${sectionId}/`)
      const data = {
        schema_version: 1,
        course: { id: section.course.id, title: section.course.title },
        section: { id: section.id, title: section.title },
        mappings: section.word_sense_mappings.map((mapping) => ({
          id: mapping.id,
          subtitle_words: mapping.subtitle_words.map((word) => ({
            word: word.word,
            cue_id: word.cue_id,
            position_in_cue: word.position_in_cue,
            cue_start_time: word.cue_start_time,
            cue_end_time: word.cue_end_time,
          })),
          senses: mapping.senses.map((sense) => ({
            id: sense.id,
            word: sense.entry.word,
            part_of_speech: sense.entry.part_of_speech,
            sense_number: sense.sense_number,
            definition: sense.definition,
          })),
        })),
      }
      const json = JSON.stringify(data, null, 2)
      try {
        await navigator.clipboard.writeText(json)
        setMessage(`Copied ${data.mappings.length} saved mappings as JSON.`)
      } catch {
        setManualJson(json)
        setMessage("Clipboard access was blocked. Select and copy the JSON below.")
      }
    } catch (caught) {
      setError(caught)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return (
    <div className="my-4 space-y-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void copyMappings()}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {busy ? "Fetching mappings…" : "Copy section mappings JSON"}
      </Button>
      <p className="text-xs text-muted-foreground">Copies all saved mappings from the backend. Save any mapping edits first. Provide the matching subtitle file separately.</p>
      {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
      <ApiErrorMessage error={error} />
      {manualJson ? (
        <label className="block text-sm font-medium">
          Section mappings JSON
          <textarea
            readOnly
            value={manualJson}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 min-h-48 w-full rounded-lg border bg-background p-3 font-mono text-xs"
          />
        </label>
      ) : null}
    </div>
  )
}
