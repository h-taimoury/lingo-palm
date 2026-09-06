"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import type { DetailResponse } from "@/types/api/common"

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await apiClient.post<DetailResponse>("/api/users/logout/", {})
        } finally {
          router.replace("/login")
          router.refresh()
        }
      }}
    >
      <LogOut className="size-4" />
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  )
}
