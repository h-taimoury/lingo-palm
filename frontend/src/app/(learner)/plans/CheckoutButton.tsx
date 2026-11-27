"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function CheckoutButton() {
  const t = useTranslations();

  const router = useRouter();
  const reference = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function checkout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      reference.current ??= crypto.randomUUID();
      const order = await apiClient.post<{ reference: string; checkout_url?: string }, { reference: string }>(
        "/api/billing/checkout/", { reference: reference.current },
      );
      if (order.checkout_url) window.location.assign(order.checkout_url);
      else router.push(`/payments/${order.reference}`);
    } catch (caught) {
      setError(caught);
      setBusy(false);
      inFlight.current = false;
    }
  }

  return <><ApiErrorMessage error={error} /><Button disabled={busy} onClick={checkout}>{busy ? t("Opening checkout…") : t("Pay with ZarinPal")}</Button></>;
}
