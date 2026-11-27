"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Sparkles, TrendingUp } from "lucide-react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import type { LearningProgress } from "@/types/api/vocabulary";
import { formatLearningDate, LearningChart } from "./LearningChart";
import { useTranslations, useLocale } from "@/lib/i18n/LocaleProvider";

export function ProgressDashboard() {
  const t = useTranslations();
  const locale = useLocale();

  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<LearningProgress | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ days: String(days), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    apiClient.get<LearningProgress>(`/api/my-vocabulary/vocabulary/progress/?${query}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, retry]);

  const busy = loading || data?.days !== days;

  return (
    <div className="mt-8 space-y-6" aria-busy={!error && busy}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("New meanings learned here. “Already knew” senses don’t count.")}</p>
        <div className="flex gap-1 rounded-xl border bg-muted/40 p-1" role="group" aria-label={t("Progress period")}>
          {([7, 30, 90] as const).map((period) => <Button
            key={period}
            size="sm"
            variant={days === period ? "default" : "ghost"}
            aria-pressed={days === period}
            onClick={() => setDays(period)}
          >{t("{0} days", { 0: period })}</Button>)}
        </div>
      </div>
      {error ? <div className="space-y-3">
        <ApiErrorMessage error={error} />
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>{t("Try again")}</Button>
      </div> : busy || !data ? <div role="status" className="rounded-xl border bg-muted/20 p-10 text-center text-muted-foreground">
        {t("Loading your progress…")}</div> : <>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t("Total senses learned"), value: data.total_learned.toLocaleString(locale), detail: t("Since you started"), icon: BookOpen },
            { label: t("Learned this period"), value: data.period_learned.toLocaleString(), detail: t("Over the last {0} days", { 0: days }), icon: TrendingUp },
            { label: t("Learning days"), value: `${data.learning_days} / ${days}`, detail: t("Days you learned a new meaning"), icon: CalendarDays },
          ].map(({ label, value, detail, icon: Icon }) => <Card key={label} className="gap-0">
            <CardContent>
              <dl>
                <div className="flex items-center justify-between gap-3"><dt className="text-sm text-muted-foreground">{label}</dt><Icon aria-hidden="true" className="size-4 text-primary" /></div>
                <dd className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</dd>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>)}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold">{t("Your learning over time")}</h2><p className="mt-1 text-sm text-muted-foreground">{days === 90 ? t("Weekly totals") : t("Senses learned per day")} · {formatLearningDate(data.start_date, locale)} – {formatLearningDate(data.end_date, locale)}</p></div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{t("{0} new senses", { 0: data.period_learned.toLocaleString() })}</span>
            </div>
          </CardHeader>
          <CardContent>
            <LearningChart key={days} days={data.daily_counts} weekly={days === 90} />
            {!data.period_learned ? <p className="mt-5 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              {t("No new senses in this period yet.")} <Link href="/courses" className="font-medium text-primary underline underline-offset-4">{t("Explore a course")}</Link>  {t("to learn your next meaning.")}</p> : null}
            <p className="mt-4 text-xs text-muted-foreground">{t("Dates follow your time zone (")}{data.timezone.replaceAll("_", " ")}).</p>
          </CardContent>
        </Card>

        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("Recently learned")}</h2><Link href="/my-vocabulary" className="shrink-0 text-sm font-medium text-primary hover:underline">{t("My vocabulary")} <span aria-hidden="true">↗</span></Link></div></CardHeader>
            <CardContent>
              {data.recently_learned.length ? <ul className="divide-y">
                {data.recently_learned.map((row) => <li key={row.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div lang="en" dir="ltr" className="min-w-0"><p className="font-semibold">{row.sense.lex_unit || row.sense.entry.word}<span className="ms-2 text-xs font-normal text-muted-foreground">{row.sense.entry.part_of_speech}</span></p><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{row.sense.definition}</p></div>
                  <time dateTime={row.learned_at!} className="shrink-0 pt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: data.timezone }).format(new Date(row.learned_at!))}</time>
                </li>)}
              </ul> : <p className="py-4 text-sm leading-6 text-muted-foreground">{t("Your first learned meaning will appear here. Mark a new sense as learned while exploring a course.")}</p>}
            </CardContent>
          </Card>

          <Card className="bg-secondary/50">
            <CardContent>
              <span className="inline-flex rounded-xl bg-background p-2.5 text-primary"><Sparkles aria-hidden="true" className="size-5" /></span>
              <h2 className="mt-4 text-lg font-semibold">{t("Keep it fresh")}</h2>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{data.review_due_count.toLocaleString()}</p>
              <p className="mt-1 text-sm text-muted-foreground">{data.review_due_count === 1 ? t("sense ready for review") : t("senses ready for review")}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{data.review_due_count ? t("A little recall helps new meanings stay with you.") : t("You’re all caught up. Come back when your next review is due.")}</p>
              <Link href={data.review_due_count ? "/review" : "/courses"} className={buttonVariants({ className: "mt-5 w-full", variant: data.review_due_count ? "default" : "outline" })}>
                {data.review_due_count ? t("Start review") : t("Continue learning")}<ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </>}
    </div>
  );
}
