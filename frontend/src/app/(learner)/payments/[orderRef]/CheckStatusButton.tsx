"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function CheckStatusButton() {
  const t = useTranslations();

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
    {pending ? t("Checking…") : t("Refresh payment status")}
  </Button>;
}
