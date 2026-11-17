"use client";

import { useEffect, useState } from "react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import type { DetailResponse } from "@/types/api/common";

export function EmailRequestForm({ kind, email = "", sent = false }: { kind: "verification" | "reset"; email?: string; sent?: boolean }) {
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState(sent ? "Check your email for the verification link. It expires in 24 hours." : "");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(sent ? 60 : 0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient.post<DetailResponse>(`/api/users/${kind === "verification" ? "resend-verification" : "forgot-password"}/`, { email: form.get("email") }, { retryOnUnauthorized: false });
      setMessage(response.detail);
      setCooldown(60);
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <ApiErrorMessage error={error} />
      {message ? <p role="status" className="rounded-md border bg-muted p-3 text-sm">{message}</p> : null}
      <div className="space-y-2"><Label htmlFor="request_email">Email</Label><Input id="request_email" name="email" type="email" autoComplete="email" defaultValue={email} required /></div>
      <Button type="submit" className="w-full" disabled={busy || cooldown > 0}>
        {busy ? "Sending…" : cooldown ? `Send again in ${cooldown}s` : kind === "verification" ? "Send verification email" : "Send reset link"}
      </Button>
      <p className="text-sm text-muted-foreground">Check your spam folder if the email doesn’t arrive. {kind === "reset" ? "Reset links expire in 30 minutes. Your email must be verified first." : "Verification links expire in 24 hours."}</p>
    </form>
  );
}
