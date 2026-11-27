"use client";

import { useState } from "react";
import type { LearningDay } from "@/types/api/vocabulary";
import { useTranslations, useLocale } from "@/lib/i18n/LocaleProvider";

export function formatLearningDate(date: string, locale = "en") {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

export function learningBuckets(days: LearningDay[], weekly: boolean) {
  const size = weekly ? 7 : 1;
  const buckets: { start: string; end: string; count: number }[] = [];
  for (let index = 0; index < days.length; index += size) {
    const group = days.slice(index, index + size);
    buckets.push({
      start: group[0].date,
      end: group[group.length - 1].date,
      count: group.reduce((sum, day) => sum + day.count, 0),
    });
  }
  return buckets;
}

export function LearningChart({ days, weekly }: { days: LearningDay[]; weekly: boolean }) {
  const t = useTranslations();
  const locale = useLocale();

  const [active, setActive] = useState<number | null>(null);
  const buckets = learningBuckets(days, weekly);
  const maximum = Math.max(4, Math.ceil(Math.max(0, ...buckets.map((bucket) => bucket.count)) / 4) * 4);
  function label(bucket: typeof buckets[number]) {
    return bucket.start === bucket.end ? formatLearningDate(bucket.start, locale)
      : `${formatLearningDate(bucket.start, locale)} – ${formatLearningDate(bucket.end, locale)}`;
  }
  const selected = active === null ? null : buckets[active];

  return (
    <div>
      <p className="mb-5 min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {selected ? <><span className="font-medium text-foreground">{label(selected)}</span>  {t("· {0} senses learned", { 0: selected.count })}</>
          : t("Hover, tap, or focus a bar to see the count.")}
      </p>
      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-3">
        <div aria-hidden="true" className="flex h-52 flex-col justify-between text-end text-xs tabular-nums text-muted-foreground">
          {[4, 3, 2, 1, 0].map((step) => <span key={step}>{maximum * step / 4}</span>)}
        </div>
        <div className="relative h-52" role="group" aria-label={weekly ? t("Senses learned by week") : t("Senses learned by day")}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((step) => <div key={step} className="border-t border-dashed border-border" />)}
          </div>
          <div className="relative flex h-full items-end gap-1">
            {buckets.map((bucket, index) => (
              <button
                key={bucket.start}
                type="button"
                aria-label={t("{0}: {1} senses learned", { 0: label(bucket), 1: bucket.count })}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(index)}
                className="group flex h-full min-w-0 flex-1 items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span
                  aria-hidden="true"
                  className={`w-full rounded-t-sm transition-colors ${bucket.count ? "bg-primary/75 group-hover:bg-primary group-focus:bg-primary" : "bg-border"}`}
                  style={{ height: bucket.count ? `${bucket.count / maximum * 100}%` : "2px" }}
                />
              </button>
            ))}
          </div>
        </div>
        <span aria-hidden="true" />
        <div aria-hidden="true" className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>{buckets[0] && formatLearningDate(buckets[0].start, locale)}</span>
          <span>{buckets[Math.floor(buckets.length / 2)] && formatLearningDate(buckets[Math.floor(buckets.length / 2)].start, locale)}</span>
          <span>{buckets.at(-1) && formatLearningDate(buckets.at(-1)!.end, locale)}</span>
        </div>
      </div>
      <details className="mt-5 text-sm">
        <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          {t("View chart data")}</summary>
        <div className="mt-3 max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-start text-sm">
            <caption className="sr-only">{t("Senses learned")} {weekly ? t("in each date range") : t("per day")}</caption>
            <thead><tr className="border-b bg-muted/50"><th scope="col" className="p-3">{weekly ? t("Dates") : t("Date")}</th><th scope="col" className="p-3 text-end">{t("Senses learned")}</th></tr></thead>
            <tbody>{buckets.map((bucket) => <tr key={bucket.start} className="border-b last:border-0">
              <th scope="row" className="p-3 font-normal">{label(bucket)}</th>
              <td className="p-3 text-end tabular-nums">{bucket.count}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
