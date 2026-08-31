"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoaderCircle } from "lucide-react"

import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import { safeReturnTo } from "@/lib/auth/redirects"
import type { DetailResponse } from "@/types/api/common"
import type { LoginRequest } from "@/types/api/users"

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body: LoginRequest = { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") }
    setBusy(true); setError(null)
    try {
      await apiClient.post<DetailResponse, LoginRequest>("/api/users/login/", body, { retryOnUnauthorized: false })
      router.replace(safeReturnTo(params.get("returnTo"), "/courses"))
      router.refresh()
    } catch (caught) { setError(caught) } finally { setBusy(false) }
  }

  return <form onSubmit={submit} className="space-y-5"><ApiErrorMessage error={error} /><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required autoFocus /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div><Button className="w-full" type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Signing in…" : "Sign in"}</Button></form>
}
