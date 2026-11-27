"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import type { Sense } from "@/types/api/dictionary";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

type Field = "translation" | "short_translation";
type Decision = { value: string; status: "pending" | "confirmed" | "skipped" };
type Review = { sense: Sense; translation: Decision; short_translation: Decision };
const fields: Field[] = ["translation", "short_translation"];
const labels = { translation: "Full translation", short_translation: "Short translation" };

export function BulkTranslation() {
  const t = useTranslations();

  const [batch, setBatch] = useState<Sense[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [countRevision, setCountRevision] = useState(0);
  const [countResult, setCountResult] = useState<{ key: string; remaining?: number; failed?: boolean } | null>(null);
  const [input, setInput] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const output = JSON.stringify(batch, null, 2);
  const completed = reviews.reduce((count, row) => count + fields.filter(field => row[field].status !== "pending").length, 0);
  const row = reviews[activeIndex];
  const currentComplete = row && fields.every(field => row[field].status !== "pending");
  const section = sectionId.trim();
  const validSection = !section || (/^\d+$/.test(section) && Number.isSafeInteger(Number(section)) && Number(section) > 0);
  const countKey = `${section}:${countRevision}`;

  useEffect(() => {
    if (!validSection) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void apiClient.get<{ remaining: number }>(`/api/dictionary/senses/translation-review/?count_only=true${section ? `&section_id=${Number(section)}` : ""}`)
        .then(result => { if (!cancelled) setCountResult({ key: countKey, remaining: result.remaining }); })
        .catch(() => { if (!cancelled) setCountResult({ key: countKey, failed: true }); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [section, validSection, countKey]);

  async function generate() {
    if (lock.current) return;
    const section = sectionId.trim();
    if (section && (!/^\d+$/.test(section) || !Number.isSafeInteger(Number(section)) || Number(section) < 1)) {
      setError(new Error(t("Section ID must be a positive integer, or leave it blank for all sections.")));
      return;
    }
    if (batch.length && !saved && !window.confirm(t("Replace the current batch and discard its review?"))) return;
    lock.current = true;
    setBusy(true); setError(null);
    try {
      const senses = await apiClient.get<Sense[]>(`/api/dictionary/senses/translation-review/${section ? `?section_id=${Number(section)}` : ""}`);
      setBatch(senses); setInput(""); setReviews([]); setActiveIndex(0); setViewedCount(0); setSaved(false);
      setNotice(senses.length ? t("Selected {0} senses.", { 0: senses.length }) : section ? t("No senses need translation in section {0}.", { 0: section }) : t("No senses need translation."));
      if (senses.length) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(senses, null, 2));
          setNotice(t("Copied {0} random senses. Keep this page open while you use your AI tool.", { 0: senses.length }));
        } catch {
          setNotice(t("Automatic copying was blocked. Use Copy JSON or copy the export below."));
        }
      }
    } catch (caught) { setError(caught); }
    finally { lock.current = false; setBusy(false); }
  }

  async function importResponse() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError(null);
    try {
      const data: unknown = JSON.parse(input);
      if (!Array.isArray(data) || !data.length || data.length > 30) throw new Error(t("Paste a JSON array containing 1 to 30 senses."));
      if (batch.length && data.length !== batch.length) throw new Error(t("Return the complete exported array with the same number of senses."));
      const proposals = new Map<number, Record<string, unknown>>();
      for (const item of data) {
        if (!item || typeof item !== "object" || !Number.isSafeInteger(item.id) || item.id <= 0 || proposals.has(item.id)) {
          throw new Error(t("Every sense must have a unique positive numeric ID."));
        }
        for (const field of fields) {
          if (!(field in item) || (item[field] !== null && typeof item[field] !== "string")) {
            throw new Error(t("Sense {0}: {1} must be a string or null.", { 0: item.id, 1: field }));
          }
        }
        proposals.set(item.id, item);
      }
      // Standalone imports use database metadata and current values, not the AI's snapshot.
      const source = batch.length ? batch : await Promise.all(
        [...proposals.keys()].map(id => apiClient.get<Sense>(`/api/dictionary/senses/${id}/`))
      );
      const next = source.map(sense => {
        const proposal = proposals.get(sense.id);
        if (!proposal) throw new Error(t("Missing exported sense {0}. IDs must match the export.", { 0: sense.id }));
        const decision = (field: Field): Decision => {
          const value = sense[field] ?? (proposal[field] as string | null) ?? "";
          return {
            value: value.trim() ? value : "",
            status: !value.trim() ? "skipped" : field === "short_translation" && value.length > 100 ? "pending" : "confirmed",
          };
        };
        return { sense, translation: decision("translation"), short_translation: decision("short_translation") };
      });
      setBatch(source);
      setReviews(next);
      setActiveIndex(0);
      setViewedCount(1);
      setSaved(false);
      setNotice(t("Translations are confirmed by default; empty values are skipped. Existing translations are retained. You can edit or skip either field before saving. Confirm any edits you make."));
    } catch (caught) { setError(caught); }
    finally { lock.current = false; setBusy(false); }
  }

  function update(id: number, field: Field, decision: Decision) {
    setReviews(rows => rows.map(row => row.sense.id === id ? { ...row, [field]: decision } : row));
  }

  async function save() {
    if (lock.current || !reviews.length || viewedCount !== reviews.length || completed !== reviews.length * 2) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await apiClient.post<{ saved: number }>("/api/dictionary/senses/translation-review-save/", reviews.map(row => ({
        id: row.sense.id,
        expected_translation: row.sense.translation,
        expected_short_translation: row.sense.short_translation ?? null,
        translation: row.translation.value,
        short_translation: row.short_translation.value,
      })));
      setSaved(true); setNotice(t("Saved all {0} senses successfully.", { 0: result.saved }));
      setCountRevision(revision => revision + 1);
    } catch (caught) { setError(caught); }
    finally { lock.current = false; setBusy(false); }
  }

  const sectionFilter = <div className="space-y-1">
    <div className="flex items-center gap-2">
    <label htmlFor="batch-section-id" className="text-sm whitespace-nowrap">{t("Section ID (optional)")}</label>
    <Input id="batch-section-id" type="number" min="1" step="1" placeholder={t("All")} className="w-24" value={sectionId} disabled={busy}
      onChange={event => setSectionId(event.target.value)} />
    </div>
    <p role="status" className="text-xs text-muted-foreground">
      {!validSection ? t("Enter a positive integer.") : countResult?.key !== countKey ? t("Counting remaining senses…") : countResult.failed ? t("Could not load remaining count.") : t("{0} senses used {1} need translation.", { 0: countResult.remaining?.toLocaleString() ?? "", 1: section ? t("in section {0}", { 0: section }) : t("in at least one section") })}
    </p>
  </div>;

  return (
    <div className="mt-6 space-y-6" aria-busy={busy}>
      {!reviews.length && <>
      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{t("Export senses (optional)")}</h2>
        <p className="text-sm text-muted-foreground">{t("Randomly selects up to 30 senses used in at least one section, with a missing full translation or an unreviewed short translation. Enter a Section ID to limit the selection to that section. Skipped full translations can appear again.")}</p>
        {sectionFilter}
        <Button disabled={busy} onClick={() => void generate()}>{t("Get and copy 30 random senses")}</Button>
        {!!batch.length && <>
          <Button variant="outline" disabled={busy} onClick={() => {
            void navigator.clipboard.writeText(output).then(() => setNotice(t("JSON copied."))).catch(() => setError(new Error(t("Copy failed. Select the export text and copy it manually."))));
          }}>{t("Copy JSON")}</Button>
          <Textarea aria-label={t("Exported senses JSON")} value={output} readOnly dir="ltr" className="h-48 [field-sizing:fixed] font-mono" />
        </>}
      </section>
      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{t("Paste AI response")}</h2>
        <p className="text-sm text-muted-foreground">{t("Already have an AI response? Paste its JSON array of up to 30 senses here. No new batch is needed.")}</p>
        <Textarea aria-label={t("AI response JSON")} value={input} disabled={busy || saved || reviews.length > 0} onChange={event => setInput(event.target.value)} dir="ltr" className="h-56 [field-sizing:fixed] font-mono" />
        <Button disabled={busy || saved || reviews.length > 0 || !input.trim()} onClick={() => void importResponse()}>{busy ? t("Loading…") : t("Load review")}</Button>
      </section>
      </>}
      {row && <section aria-label={t("Sense review")} aria-roledescription="carousel" className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm text-muted-foreground">{t("Sense {0} of {1}", { 0: activeIndex + 1, 1: reviews.length })}</p>
          <div className="flex flex-wrap items-center gap-2">
            {sectionFilter}
            <Button size="sm" variant="outline" disabled={busy || activeIndex === 0} onClick={() => setActiveIndex(index => index - 1)}>{t("Previous")}</Button>
            <Button size="sm" disabled={busy || !currentComplete || activeIndex === reviews.length - 1} onClick={() => {
              setViewedCount(count => Math.max(count, activeIndex + 2));
              setActiveIndex(index => index + 1);
            }}>{t("Next")}</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void generate()}>{t("New batch")}</Button>
          </div>
        </div>
        <h2 className="font-semibold">{row.sense.entry.word} · {row.sense.entry.part_of_speech || "unspecified"}  {t("· Sense {0}", { 0: row.sense.sense_number ?? "unnumbered" })}</h2>
        {row.sense.lex_unit && <p>{row.sense.lex_unit}</p>}
        <p className="whitespace-pre-wrap">{row.sense.definition}</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {fields.map(field => <div key={field} className="min-w-0 space-y-2">
          <label htmlFor={`${row.sense.id}-${field}`} className="text-sm font-medium">{t(labels[field])}</label>
          <Textarea id={`${row.sense.id}-${field}`} dir="rtl" lang="fa" disabled={busy || saved} value={row[field].value}
            className="h-24 resize-y text-lg leading-8 md:text-lg [field-sizing:fixed]"
            onChange={event => update(row.sense.id, field, { value: event.target.value, status: "pending" })} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy || saved || !row[field].value.trim() || (field === "short_translation" && row[field].value.length > 100)}
              onClick={() => update(row.sense.id, field, { ...row[field], status: "confirmed" })}>{t("Confirm")}</Button>
            <Button size="sm" variant="outline" disabled={busy || saved} onClick={() => update(row.sense.id, field, { value: "", status: "skipped" })}>{t("Skip")}</Button>
            <span className="text-sm" role="status">{row[field].status}</span>
          </div>
          {field === "short_translation" && row[field].value.length > 100 && <p className="text-sm text-destructive">{t("Use at most 100 characters.")}</p>}
        </div>)}
        </div>
        {!currentComplete && <p className="text-sm text-muted-foreground">{t("Confirm or skip both fields before continuing.")}</p>}
      </section>}
      {!!reviews.length && <div className="sticky bottom-0 flex items-center gap-4 border bg-background p-4">
        <Button disabled={busy || saved || viewedCount !== reviews.length || completed !== reviews.length * 2} onClick={() => void save()}>{saved ? t("Saved") : busy ? t("Saving…") : t("Save {0} reviewed senses", { 0: reviews.length })}</Button>
        <span>{t("{0} / {1} senses viewed", { 0: viewedCount, 1: reviews.length })}</span>
      </div>}
      <ApiErrorMessage error={error} />
      <p role="status">{notice}</p>
    </div>
  );
}
