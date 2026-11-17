"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import type { DetailResponse } from "@/types/api/common";

export function ResetPasswordForm({ uid, token }: { uid: string; token: string }) {
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const password_confirm = String(form.get("password_confirm") ?? "");
    if (password !== password_confirm) { setError(new Error("Passwords do not match.")); return; }
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.post<DetailResponse>("/api/users/reset-password/", { uid, token, password, password_confirm }, { retryOnUnauthorized: false });
      setMessage(result.detail);
      window.history.replaceState(null, "", "/reset-password");
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }
  return message ? <div role="status" className="space-y-4"><p>{message}</p><Link href="/login" className="underline underline-offset-4">Sign in</Link></div> : (
    <form onSubmit={submit} className="space-y-5">
      <ApiErrorMessage error={error} />
      <div className="space-y-2"><Label htmlFor="reset_password">New password</Label><Input id="reset_password" name="password" type="password" autoComplete="new-password" required /></div>
      <div className="space-y-2"><Label htmlFor="reset_confirm">Confirm password</Label><Input id="reset_confirm" name="password_confirm" type="password" autoComplete="new-password" required /></div>
      <Button className="w-full" disabled={busy}>{busy ? "Resetting…" : "Reset password"}</Button>
      <Link href="/forgot-password" className="block text-sm underline underline-offset-4">Request a new reset link</Link>
    </form>
  );
}
