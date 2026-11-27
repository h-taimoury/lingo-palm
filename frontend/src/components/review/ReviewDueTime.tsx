"use client";

import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ReviewDueTime({ value }: { value: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const label = useSyncExternalStore(subscribe, () => {
    const date = new Date(value);
    return date.getTime() <= Date.now()
      ? t("Due now")
      : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  }, () => t("Scheduled"));
  return <time dateTime={value}>{label}</time>;
}
