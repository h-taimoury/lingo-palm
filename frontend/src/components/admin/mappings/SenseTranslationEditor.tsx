"use client"

import { useState } from "react"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import { useTranslations } from "@/lib/i18n/LocaleProvider"
import type { Sense, UpdateSenseRequest } from "@/types/api/dictionary"

export function SenseTranslationEditor({ sense, onSaved }: {
  sense: Sense
  onSaved: (sense: Sense) => void
}) {
  const t = useTranslations()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const body: UpdateSenseRequest = {}
    for (const field of ["translation", "short_translation"] as const) {
      const value = String(form.get(field) ?? "").trim()
      if (value !== (sense[field] ?? "").trim()) body[field] = value
    }
    setBusy(true)
    setError(null)
    try {
      if (Object.keys(body).length) {
        const saved = await apiClient.patch<Sense, UpdateSenseRequest>(
          `/api/dictionary/senses/${sense.id}/`, body,
        )
        onSaved(saved)
      }
      setEditing(false)
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  if (!editing) return (
    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => {
      setError(null)
      setEditing(true)
    }}>{t("Edit translations")}</Button>
  )

  return (
    <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border p-4">
      <ApiErrorMessage error={error} />
      <div className="space-y-2">
        <Label htmlFor={`sense-translation-${sense.id}`}>{t("Translation")}</Label>
        <Textarea
          id={`sense-translation-${sense.id}`}
          name="translation"
          lang="fa"
          dir="auto"
          defaultValue={sense.translation ?? ""}
          disabled={busy}
          rows={3}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`sense-short-translation-${sense.id}`}>{t("Short translation")}</Label>
        <Input
          id={`sense-short-translation-${sense.id}`}
          name="short_translation"
          lang="fa"
          dir="auto"
          defaultValue={sense.short_translation ?? ""}
          maxLength={100}
          disabled={busy}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? t("Saving…") : t("Save translations")}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>{t("Cancel")}</Button>
      </div>
    </form>
  )
}
