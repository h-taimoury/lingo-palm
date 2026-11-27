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
import Link from "next/link"
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function AccountForm({ user }: { user: User }) {
  const t = useTranslations();

  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pendingEmail = user.pending_email;

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const password = String(form.get("password") ?? "");
    const password_confirm = String(form.get("password_confirm") ?? "");
    if (password && password !== password_confirm) { setError(new Error(t("Passwords do not match."))); return; }
    const body: UpdateMeRequest = {
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
    };
    const email = String(form.get("email") ?? "");
    if (email.toLowerCase() !== user.email.toLowerCase()) body.email = email;
    if (password) { body.password = password; body.password_confirm = password_confirm; }
    if (password || body.email) body.current_password = String(form.get("current_password") ?? "");
    setBusy(true);
    setMessage("");
    setError(null);
    try {
      const result = await apiClient.patch<User, UpdateMeRequest>("/api/users/me/", body);
      if (password) { router.replace("/login"); router.refresh(); return; }
      setMessage(result.pending_email ? t("Check your new email for a verification link. Your current email stays active until you confirm.") : t("Account updated."));
      for (const name of ["password", "password_confirm", "current_password"]) {
        const input = element.elements.namedItem(name);
        if (input instanceof HTMLInputElement) input.value = "";
      }
      router.refresh();
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-5">
    <ApiErrorMessage error={error} />
    {message ? <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">{t(message)}</p> : null}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="account_first">{t("First name")}</Label><Input id="account_first" name="first_name" defaultValue={user.first_name} /></div>
      <div className="space-y-2"><Label htmlFor="account_last">{t("Last name")}</Label><Input id="account_last" name="last_name" defaultValue={user.last_name} /></div>
    </div>
    <div className="space-y-2"><Label htmlFor="account_email">{t("Email")}</Label><Input id="account_email" name="email" type="email" autoComplete="email" defaultValue={user.email} required /><p className="text-xs text-muted-foreground">{t("A new email must be verified before it replaces your current address.")}</p></div>
    {pendingEmail ? <p className="text-sm">{t("Awaiting verification: {0}.", { 0: pendingEmail })} <Link href={`/verify-email?${new URLSearchParams({ email: user.email })}`} className="underline underline-offset-4">{t("Resend verification")}</Link></p> : null}
    <div className="space-y-2"><Label htmlFor="account_current_password">{t("Current password")}</Label><Input id="account_current_password" name="current_password" type="password" autoComplete="current-password" /><p className="text-xs text-muted-foreground">{t("Required to change your email or password.")}</p></div>
    <div className="space-y-2"><Label htmlFor="account_password">{t("New password")}</Label><Input id="account_password" name="password" type="password" autoComplete="new-password" /><p className="text-xs text-muted-foreground">{t("Leave blank to keep your current password. Changing it signs you out on all devices.")}</p></div>
    <div className="space-y-2"><Label htmlFor="account_password_confirm">{t("Confirm new password")}</Label><Input id="account_password_confirm" name="password_confirm" type="password" autoComplete="new-password" /></div>
    <Button disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? t("Saving…") : t("Save changes")}</Button>
  </form>
}
