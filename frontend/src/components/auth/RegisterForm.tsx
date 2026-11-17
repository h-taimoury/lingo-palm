"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import type { RegisterRequest } from "@/types/api/users";
import type { DetailResponse } from "@/types/api/common";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: RegisterRequest = {
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      password_confirm: String(form.get("password_confirm") ?? ""),
    };
    if (body.password !== body.password_confirm) {
      setError(new Error("Passwords do not match."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.post<DetailResponse, RegisterRequest>(
        "/api/users/register/",
        body,
        { retryOnUnauthorized: false },
      );
      router.replace(`/verify-email?${new URLSearchParams({ email: body.email, sent: "1" })}`);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <ApiErrorMessage error={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            name="first_name"
            autoComplete="given-name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            name="last_name"
            autoComplete="family-name"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="register_email">Email</Label>
        <Input
          id="register_email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register_password">Password</Label>
        <Input
          id="register_password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register_password_confirm">Confirm password</Label>
        <Input id="register_password_confirm" name="password_confirm" type="password" autoComplete="new-password" required />
      </div>
      <Button className="w-full" type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
