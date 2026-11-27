"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import type { DetailResponse } from "@/types/api/common";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function CorrectEmailForm() {
  const t = useTranslations();

  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const new_email = String(form.get("new_email") ?? "");
    setBusy(true);
    setError(null);
    try {
      await apiClient.post<DetailResponse>("/api/users/correct-email/", { email: form.get("email"), new_email, password: form.get("password") }, { retryOnUnauthorized: false });
      router.replace(`/verify-email?${new URLSearchParams({ email: new_email, sent: "1" })}`);
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <ApiErrorMessage error={error} />
    <div className="space-y-2"><Label htmlFor="original_email">{t("Email entered during registration")}</Label><Input id="original_email" name="email" type="email" autoComplete="username" required /></div>
    <div className="space-y-2"><Label htmlFor="correct_email">{t("Correct email")}</Label><Input id="correct_email" name="new_email" type="email" autoComplete="email" required /></div>
    <div className="space-y-2"><Label htmlFor="correction_password">{t("Password")}</Label><Input id="correction_password" name="password" type="password" autoComplete="current-password" required /></div>
    <Button className="w-full" disabled={busy}>{busy ? t("Updating…") : t("Update email and send verification")}</Button>
  </form>;
}
