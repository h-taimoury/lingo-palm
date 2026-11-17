"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import type { DetailResponse } from "@/types/api/common";

export function VerifyEmailForm({ token }: { token: string }) {
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.post<DetailResponse>("/api/users/verify-email/", { token }, { retryOnUnauthorized: false });
      setMessage(result.detail);
      window.history.replaceState(null, "", "/verify-email");
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }
  return message ? <div role="status" className="space-y-4"><p>{message}</p><Link href="/login" className="underline underline-offset-4">Sign in</Link></div> : (
    <form onSubmit={submit} className="space-y-4">
      <ApiErrorMessage error={error} />
      <p className="text-sm text-muted-foreground">Confirm this address to finish verifying your email.</p>
      <Button className="w-full" disabled={busy}>{busy ? "Verifying…" : "Verify my email"}</Button>
      <Link href="/verify-email" className="block text-sm underline underline-offset-4">Request a new verification link</Link>
    </form>
  );
}
