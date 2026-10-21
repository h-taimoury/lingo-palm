"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import type { WordSenseMapping } from "@/types/api/courses";
import { mappedSelectionKeys, selectionKey, selectionExport, type SelectionContext } from "@/lib/subtitles/bulkSelecting";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

export function BulkSelecting({ sectionId, mappings }: { sectionId: number; mappings: WordSenseMapping[] }) {
  const [context, setContext] = useState<SelectionContext | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const base = `/api/courses/sections/${sectionId}/bulk-mappings`;
  const count = Object.keys(selected).length;
  useUnsavedChangesWarning(count > 0 && !exported);

  useEffect(() => {
    let active = true;
    apiClient.get<SelectionContext>(`${base}/context/`).then(value => {
      if (active) { setContext(value); setError(null); }
    }).catch(caught => { if (active) setError(caught); });
    return () => { active = false; };
  }, [base, attempt]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!context || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (key !== "d" && key !== "f") return;
      event.preventDefault();
      setIndex(current => Math.max(0, Math.min(context.cues.length - 1, current + (key === "d" ? -1 : 1))));
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [context]);

  function update(key: string, value: true | null) {
    setSelected(previous => {
      const next = { ...previous };
      if (value === null) delete next[key]; else next[key] = value;
      return next;
    });
    setExported(false);
  }

  async function download() {
    if (!context) return;
    setBusy(true); setError(null);
    try {
      const current = await apiClient.get<SelectionContext>(`${base}/context/`);
      if (current.subtitle_sha256 !== context.subtitle_sha256) throw new Error("The subtitles changed. Reload this page before selecting words from the updated file.");
      const data = selectionExport(context, selected, mappedSelectionKeys(context, mappings));
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `section-${sectionId}-selected-vocabulary.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExported(true);
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  }

  const cue = context?.cues[index];
  const mapped = context ? mappedSelectionKeys(context, mappings) : new Set<string>();
  return <div className="mt-8 space-y-6">
    {error ? <ApiErrorMessage error={error} /> : null}
    {!context ? <div role="status">{error ? <Button onClick={() => setAttempt(value => value + 1)}>Retry loading subtitles</Button> : "Loading subtitles…"}</div> : null}
    {context && cue ? <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status">{count} word occurrences selected</p>
        <Button disabled={!count || busy} onClick={download}>{busy ? "Validating…" : "Export selections JSON"}</Button>
      </div>
      <p className="text-sm text-muted-foreground">Send this export to your AI assistant to choose the correct dictionary headwords and prepare the JSON for Bulk Mappings. Select only the main word of a phrase. Selections stay on this page until you leave; export to keep them.</p>
      {exported ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Selections exported.</p> : null}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded bg-emerald-100 px-3 py-1 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Already mapped · locked</span>
        <span className="rounded bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Selected · click to remove</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex(value => value - 1)}>Previous (D)</Button>
        <p aria-live="polite" className="text-center text-sm">Cue {cue.cue_id} · {index + 1} of {context.cues.length}</p>
        <Button variant="outline" disabled={index === context.cues.length - 1} onClick={() => setIndex(value => value + 1)}>Next (F)</Button>
      </div>
      <section aria-label={`Subtitle cue ${cue.cue_id}`} className="rounded-xl border bg-card p-6 sm:p-10">
        <div className="flex min-h-32 flex-wrap content-center justify-center gap-2 text-xl leading-relaxed sm:text-2xl">
          {cue.tokens.map(token => {
            const key = selectionKey(cue.cue_id, token.index);
            const locked = mapped.has(key);
            const chosen = key in selected;
            const label = token.word.replace(/<[^>]*>/g, "");
            return <button key={key} type="button" disabled={locked || busy || !/[a-zA-Z]/.test(label)} aria-pressed={chosen}
              aria-label={`${label}${locked ? " (already mapped)" : chosen ? " (selected)" : ""}`}
              title={locked ? "Already mapped" : chosen ? "Remove selection" : "Select word"}
              className={`rounded-md border px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${locked ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : chosen ? "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "border-transparent hover:border-border hover:bg-muted"}`}
              onClick={() => update(key, chosen ? null : true)}>{label}</button>;
          })}
        </div>
      </section>
    </> : null}
  </div>;
}
