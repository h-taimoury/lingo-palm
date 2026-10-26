"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import type { WordSenseMapping } from "@/types/api/courses";
import { mappedSelectionKeys, selectionKey, selectionExport, toggleSelection, type VocabularySelection, type SelectionContext } from "@/lib/subtitles/bulkSelecting";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

const phraseColors = [
  "border-violet-400 bg-violet-100 text-violet-950 dark:bg-violet-950 dark:text-violet-100",
  "border-sky-400 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100",
  "border-rose-400 bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100",
  "border-orange-400 bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-100",
];
const groupNumber = (group: string) => Number(group.split("-").at(-1));
const groupColor = (group: string) => phraseColors[(groupNumber(group) - 1) % phraseColors.length];

export function BulkSelecting({ sectionId, mappings }: { sectionId: number; mappings: WordSenseMapping[] }) {
  const [context, setContext] = useState<SelectionContext | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<VocabularySelection>({});
  const gesture = useRef<{ cueId: number; group: string } | null>(null);
  const groupSequence = useRef(0);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const base = `/api/courses/sections/${sectionId}/bulk-mappings`;
  const count = Object.keys(selected).length;
  useUnsavedChangesWarning(count > 0 && !exported);

  useEffect(() => {
    const endGroup = () => { gesture.current = null; };
    const keyup = (event: KeyboardEvent) => {
      if (event.key === "Control" || event.key === "Meta") endGroup();
    };
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", endGroup);
    return () => {
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", endGroup);
    };
  }, []);

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
      gesture.current = null;
      setIndex(current => Math.max(0, Math.min(context.cues.length - 1, current + (key === "d" ? -1 : 1))));
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [context]);

  function update(cueId: number, key: string, grouping: boolean) {
    if (!grouping) gesture.current = null;
    else if (!gesture.current || gesture.current.cueId !== cueId) {
      gesture.current = { cueId, group: `phrase-${++groupSequence.current}` };
    }
    const group = gesture.current?.group;
    setSelected(previous => toggleSelection(previous, key, group));
    setExported(false);
  }

  function navigate(delta: number) {
    gesture.current = null;
    setIndex(value => value + delta);
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
  const cueGroups = new Map<string, string[]>();
  for (const token of cue?.tokens ?? []) {
    const choice = selected[selectionKey(cue!.cue_id, token.index)];
    if (typeof choice === "string") {
      cueGroups.set(choice, [...(cueGroups.get(choice) ?? []), token.word.replace(/<[^>]*>/g, "")]);
    }
  }
  return <div className="mt-8 space-y-6">
    {error ? <ApiErrorMessage error={error} /> : null}
    {!context ? <div role="status">{error ? <Button onClick={() => setAttempt(value => value + 1)}>Retry loading subtitles</Button> : "Loading subtitles…"}</div> : null}
    {context && cue ? <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status">{count} word occurrences selected</p>
        <Button disabled={!count || busy} onClick={download}>{busy ? "Validating…" : "Export selections JSON"}</Button>
      </div>
      <p className="text-sm text-muted-foreground">Click a word to select it individually. Hold Ctrl (Cmd on Mac) while clicking the words of a phrase: they share a color and group number. Release the key to finish the group; hold it again to start another. Words can be non-adjacent but must be in the same cue. Click a selected word without Ctrl to remove it. Send the exported JSON to your AI assistant; each group stays together as one mapping. Export before leaving this page to keep your selections.</p>
      {exported ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Selections exported.</p> : null}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded bg-emerald-100 px-3 py-1 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Already mapped · locked</span>
        <span className="rounded bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Selected · click to remove</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={index === 0} onClick={() => navigate(-1)}>Previous (D)</Button>
        <p aria-live="polite" className="text-center text-sm">Cue {cue.cue_id} · {index + 1} of {context.cues.length}</p>
        <Button variant="outline" disabled={index === context.cues.length - 1} onClick={() => navigate(1)}>Next (F)</Button>
      </div>
      <section aria-label={`Subtitle cue ${cue.cue_id}`} className="rounded-xl border bg-card p-6 sm:p-10">
        <div className="flex min-h-32 flex-wrap content-center justify-center gap-2 text-xl leading-relaxed sm:text-2xl">
          {cue.tokens.map(token => {
            const key = selectionKey(cue.cue_id, token.index);
            const locked = mapped.has(key);
            const chosen = key in selected;
            const choice = selected[key];
            const group = typeof choice === "string" ? choice : null;
            const label = token.word.replace(/<[^>]*>/g, "");
            return <button key={key} type="button" disabled={locked || busy || !/[a-zA-Z]/.test(label)} aria-pressed={chosen}
              aria-label={`${label}${locked ? " (already mapped)" : group ? ` (group ${groupNumber(group)})` : chosen ? " (selected)" : ""}`}
              title={locked ? "Already mapped" : chosen ? "Remove selection" : "Select word"}
              className={`select-none rounded-md border px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${locked ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : group ? groupColor(group) : chosen ? "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "border-transparent hover:border-border hover:bg-muted"}`}
              onClick={event => update(cue.cue_id, key, event.ctrlKey || event.metaKey)}>{label}{group && !locked ? <sup className="ml-1 text-xs">{groupNumber(group)}</sup> : null}</button>;
          })}
        </div>
        {cueGroups.size ? <ul aria-label="Selected phrase groups" className="mt-4 flex flex-wrap gap-2">
          {[...cueGroups].map(([group, words]) => <li key={group} className={`rounded-md border px-3 py-1 text-sm ${groupColor(group)}`}>
            Group {groupNumber(group)}: {words.join(" … ")}
          </li>)}
        </ul> : null}
      </section>
    </> : null}
  </div>;
}
