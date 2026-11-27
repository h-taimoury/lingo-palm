"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export type ReviewStatus = "all" | "review" | "stable";
export type PriorKnowledge = "all" | "known" | "here";

export function VocabularyFilterFields({ value, source, disabled, onChange }: {
  value: ReviewStatus;
  source: PriorKnowledge;
  disabled: boolean;
  onChange: (value: ReviewStatus, source: PriorKnowledge) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap items-center gap-x-20 gap-y-3">
    <label className="flex items-center gap-3 whitespace-nowrap text-sm font-medium">
      {t("Review status")}<span className="relative inline-grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 ps-2 pe-6">{t("In review")}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 ps-2 pe-6">{t("Already knew")}</span>
    <select
      aria-label={t("Filter vocabulary by review status")}
      aria-busy={disabled}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value as ReviewStatus, source)}
      className="col-start-1 row-start-1 h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-background ps-2 pe-6 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="all">{t("All")}</option>
      <option value="review">{t("In review")}</option>
      <option value="stable">{t("Review off")}</option>
    </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-1.5 top-1/2 size-3 -translate-y-1/2" />
    </span>
    </label>
    <label className="flex items-center gap-3 whitespace-nowrap text-sm font-medium">
      {t("Prior knowledge")}<span className="relative inline-grid">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 ps-2 pe-6">{t("In review")}</span>
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 ps-2 pe-6">{t("Already knew")}</span>
      <select
        aria-busy={disabled}
        disabled={disabled}
        value={source}
        onChange={(event) => onChange(value, event.target.value as PriorKnowledge)}
        className="col-start-1 row-start-1 h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-background ps-2 pe-6 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="all">{t("All")}</option>
        <option value="known">{t("Already knew")}</option>
        <option value="here">{t("Learned here")}</option>
      </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2" />
      </span>
    </label>
    </div>
  );
}
