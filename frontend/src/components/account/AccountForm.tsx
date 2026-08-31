"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import type { UpdateMeRequest, User } from "@/types/api/users"

export function AccountForm({ user }: { user: User }) {
  const router = useRouter(); const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? ""); const body: UpdateMeRequest = { email: String(form.get("email") ?? ""), first_name: String(form.get("first_name") ?? ""), last_name: String(form.get("last_name") ?? "") }; if (password) body.password = password; setBusy(true); setSaved(false); setError(null); try { await apiClient.patch<User, UpdateMeRequest>("/api/users/me/", body); setSaved(true); router.refresh() } catch (caught) { setError(caught) } finally { setBusy(false) } }
  return <form onSubmit={submit} className="space-y-5"><ApiErrorMessage error={error} />{saved ? <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">Account updated.</p> : null}<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="account_first">First name</Label><Input id="account_first" name="first_name" defaultValue={user.first_name} /></div><div className="space-y-2"><Label htmlFor="account_last">Last name</Label><Input id="account_last" name="last_name" defaultValue={user.last_name} /></div></div><div className="space-y-2"><Label htmlFor="account_email">Email</Label><Input id="account_email" name="email" type="email" defaultValue={user.email} required /></div><div className="space-y-2"><Label htmlFor="account_password">New password</Label><Input id="account_password" name="password" type="password" autoComplete="new-password" /><p className="text-xs text-muted-foreground">Leave blank to keep your current password.</p></div><Button disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Saving…" : "Save changes"}</Button></form>
}
