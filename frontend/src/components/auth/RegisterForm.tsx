"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import type { RegisterRequest, User } from "@/types/api/users";

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
    };
    setBusy(true);
    setError(null);
    try {
      await apiClient.post<User, RegisterRequest>(
        "/api/users/register/",
        body,
        { retryOnUnauthorized: false },
      );
      router.replace("/courses");
      // I commented this out. I really don't know if it's necessary or not. I think it might be necessary, but I don't know for sure. If you find that after logging in, the page doesn't update to show the user as logged in, then uncomment this line.
      // router.refresh();
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
      <Button className="w-full" type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
