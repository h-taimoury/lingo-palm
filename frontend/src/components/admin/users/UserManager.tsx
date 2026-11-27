"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import type { AdminUser, UpdateAdminUserRequest } from "@/types/api/users"
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function UserManager({ user, isSelf, canVerifyEmail }: { user: AdminUser; isSelf: boolean; canVerifyEmail: boolean }) {
  const t = useTranslations();

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const canMarkVerified = canVerifyEmail && !isSelf && !user.email_verified;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const body: UpdateAdminUserRequest = {
      email: String(form.get("email") ?? ""),
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
    };
    if (!isSelf) {
      body.is_staff = form.get("is_staff") === "on";
      body.is_active = form.get("is_active") === "on";
    }
    if (canMarkVerified && form.get("email_verified") === "on") body.email_verified = true;
    if (password) body.password = password;
    setBusy(true);
    setError(null);
    try {
      await apiClient.patch<AdminUser, UpdateAdminUserRequest>(`/api/users/${user.id}/`, body);
      router.refresh();
      setOpen(false);
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (isSelf || !window.confirm(t("Delete {0}?", { 0: user.email }))) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.delete(`/api/users/${user.id}/`);
      router.refresh();
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }

  return <div className="border-b p-4 last:border-b-0">
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{user.full_name || user.email}</p>
        <p className="text-sm text-muted-foreground">{user.email} · {user.is_staff ? t("Staff") : t("Learner")} · {user.is_active ? t("Active") : t("Inactive")} · {user.email_verified ? t("Email verified") : t("Email not verified")}{isSelf ? t(" · You") : ""}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>{open ? t("Close") : t("Edit")}</Button>
      {!isSelf ? <Button variant="destructive" size="sm" disabled={busy} onClick={() => void remove()}>{t("Delete")}</Button> : null}
    </div>
    {!open && error ? <div className="mt-4"><ApiErrorMessage error={error} /></div> : null}
    {open ? <form onSubmit={submit} className="mt-5 grid gap-4 rounded-lg border bg-muted/10 p-4">
      <ApiErrorMessage error={error} />
      <div className="grid gap-4 sm:grid-cols-2"><Field label={t("First name")} name="first_name" value={user.first_name} id={user.id} /><Field label={t("Last name")} name="last_name" value={user.last_name} id={user.id} /></div>
      <Field label={t("Email")} name="email" value={user.email} id={user.id} type="email" />
      <div className="space-y-2"><Label htmlFor={`password-${user.id}`}>{t("New password")}</Label><Input id={`password-${user.id}`} name="password" type="password" autoComplete="new-password" /><p className="text-xs text-muted-foreground">{t("Leave blank to keep the current password.")}</p></div>
      {canMarkVerified ? <label className="flex items-center gap-2 text-sm"><input className="size-4" type="checkbox" name="email_verified" />  {t("Mark email as verified")}</label> : null}
      {isSelf ? <p className="text-xs text-muted-foreground">{t("Staff/active toggles are disabled for your own account to avoid accidentally locking yourself out.")}</p> : <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input className="size-4" type="checkbox" name="is_staff" defaultChecked={user.is_staff} />  {t("Staff")}</label><label className="flex items-center gap-2"><input className="size-4" type="checkbox" name="is_active" defaultChecked={user.is_active} />  {t("Active")}</label></div>}
      <Button className="w-fit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{t("Save user")}</Button>
    </form> : null}
  </div>;
}
function Field({ label, name, value, id, type = "text" }: { label: string; name: string; value: string; id: number; type?: string }) { return <div className="space-y-2"><Label htmlFor={`${name}-${id}`}>{label}</Label><Input id={`${name}-${id}`} name={name} type={type} defaultValue={value} required={name === "email"} /></div> }
