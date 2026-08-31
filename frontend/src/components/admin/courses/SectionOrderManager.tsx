"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api/client"
import type { SectionSummary } from "@/types/api/courses"

export function SectionOrderManager({
  courseId,
  sections,
}: {
  courseId: number
  sections: SectionSummary[]
}) {
  const router = useRouter()
  const [orders, setOrders] = useState<Record<number, number>>(() =>
    Object.fromEntries(sections.map((section) => [section.id, section.order])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function save() {
    const changed = sections.filter(
      (section) => orders[section.id] !== section.order,
    )
    if (!changed.length) return

    setBusy(true)
    setError(null)
    try {
      // There is no bulk-reorder endpoint in Django. Send the smallest set of
      // PATCHes; if one fails, refresh from Django because earlier PATCHes may
      // already have succeeded.
      for (const section of changed) {
        await apiClient.patch(`/api/courses/sections/${section.id}/`, {
          order: orders[section.id],
        })
      }
    } catch (caught) {
      setError(caught)
    } finally {
      router.refresh()
      setBusy(false)
    }
  }

  if (!sections.length) {
    return (
      <p className="rounded-xl border border-dashed p-7 text-sm text-muted-foreground">
        No sections yet.
      </p>
    )
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="divide-y">
        {sections.map((section) => (
          <div key={section.id} className="flex flex-wrap items-center gap-3 p-4">
            <Input
              aria-label={`Order for ${section.title}`}
              type="number"
              min={0}
              className="w-24"
              value={orders[section.id] ?? section.order}
              onChange={(event) =>
                setOrders((current) => ({
                  ...current,
                  [section.id]: Number(event.target.value),
                }))
              }
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/courses/${courseId}/sections/${section.id}`}
                className="font-medium hover:underline"
              >
                {section.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {section.is_published ? "Published" : "Draft"} ·{" "}
                {section.new_words_count ?? 0} new senses
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t p-4">
        <ApiErrorMessage error={error} />
        <Button
          variant="outline"
          disabled={
            busy ||
            sections.every((section) => orders[section.id] === section.order)
          }
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save order changes"}
        </Button>
      </div>
    </div>
  )
}
