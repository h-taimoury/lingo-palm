"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Trash2 } from "lucide-react"

import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"

export function DeleteButton({
  endpoint,
  confirmation,
  redirectTo,
  label = "Delete",
}: {
  endpoint: string
  confirmation: string
  redirectTo?: string
  label?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function remove() {
    if (!window.confirm(confirmation)) return

    setBusy(true)
    setError(null)
    try {
      await apiClient.delete(endpoint)
      if (redirectTo) router.push(redirectTo)
      else router.refresh()
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={busy}
        onClick={() => void remove()}
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        {busy ? "Deleting…" : label}
      </Button>
      {error ? <ApiErrorMessage error={error} /> : null}
    </div>
  )
}
