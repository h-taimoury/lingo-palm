"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import { loadUntranslatedSenses, parseTranslations, randomTranslationBatch } from "@/lib/bulkTranslation";
import type { PaginatedResponse } from "@/types/api/common";
import type { Sense, UpdateSenseRequest } from "@/types/api/dictionary";

const loadQueue = () => loadUntranslatedSenses(path => apiClient.get<PaginatedResponse<Sense>>(path));

export function BulkTranslate() {
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const locked = useRef(false);

  async function generate() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(null); setNotice(""); setFailures([]);
    try {
      const senses = await loadQueue();
      const batch = randomTranslationBatch(senses);
      setOutput(batch.length ? JSON.stringify(batch, null, 2) : "");
      setNotice(batch.length ? `Selected ${batch.length} random senses from ${senses.length} untranslated senses.` : "Every sense used in a section has a translation.");
    } catch (caught) { setError(caught); }
    finally { locked.current = false; setBusy(false); }
  }

  async function save() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(null); setNotice(""); setFailures([]);
    try {
      // Validate the entire document before making any changes.
      const rows = parseTranslations(input);
      const eligible = new Set((await loadQueue()).map(sense => sense.id));
      let saved = 0;
      let skipped = 0;
      const failed: string[] = [];
      for (const row of rows) {
        if (!eligible.has(row.id)) { skipped++; continue; }
        try {
          // Recheck just before writing, including when retrying a partial import.
          const current = await apiClient.get<Sense>(`/api/dictionary/senses/${row.id}/`);
          if (current.translation?.trim()) { skipped++; continue; }
          await apiClient.patch<Sense, UpdateSenseRequest>(`/api/dictionary/senses/${row.id}/`, { translation: row.translation });
          saved++;
        } catch (caught) {
          failed.push(`Sense ${row.id}: ${caught instanceof Error ? caught.message : "Could not save translation."}`);
        }
        setNotice(`Saving: ${saved} saved, ${skipped} skipped, ${failed.length} failed.`);
      }
      setFailures(failed);
      setNotice(`${saved} saved. ${skipped} skipped because they already have translations or are no longer in the section translation queue. ${failed.length} failed.${failed.length ? " Your JSON is preserved; retry to save the remaining translations." : ""}`);
    } catch (caught) { setError(caught); }
    finally { locked.current = false; setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(output); setNotice("JSON copied."); }
    catch { setError(new Error("Could not copy automatically. Select and copy the JSON below.")); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([output], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "senses-to-translate.json"; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8 space-y-6" aria-busy={busy}>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">1. Get senses</h2>
        <p className="text-sm text-muted-foreground">Each batch is randomly selected from all senses used in sections that still need a translation. Skipped senses can appear again in a later batch.</p>
        <Button disabled={busy} onClick={() => void generate()}>{busy ? "Working…" : "Get 25 random senses"}</Button>
        {output && <>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void copy()}>Copy JSON</Button>
            <Button variant="outline" disabled={busy} onClick={download}>Download JSON</Button>
          </div>
          <Label htmlFor="bulk-export">JSON to translate</Label>
          <Textarea id="bulk-export" value={output} readOnly dir="ltr" className="h-72 min-h-72 [field-sizing:fixed] font-mono" />
        </>}
      </section>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">2. Import translations</h2>
        <p className="text-sm text-muted-foreground">Ask your AI tool to fill in each translation in Persian, keeping the sense IDs unchanged. Use a concise equivalent when it captures the meaning; otherwise translate the definition. Return the same JSON array. Leave translations blank or omit senses you want to skip.</p>
        <Label htmlFor="bulk-import">Translated JSON</Label>
        <Textarea id="bulk-import" value={input} onChange={event => setInput(event.target.value)} disabled={busy} dir="ltr" spellCheck={false} className="h-72 min-h-72 [field-sizing:fixed] font-mono" placeholder={'[{ "id": 123, "translation": "ترجمهٔ فارسی" }]'} />
        <Button disabled={busy || !input.trim()} onClick={() => void save()}>{busy ? "Working…" : "Save translations"}</Button>
        <p className="text-xs text-muted-foreground">Only non-empty translations are saved. Existing translations are skipped. You can return to this page later to import your JSON.</p>
      </section>
      <ApiErrorMessage error={error} />
      <p role="status" className="text-sm">{notice}</p>
      {failures.length > 0 && <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-destructive">{failures.map(failure => <li key={failure}>{failure}</li>)}</ul>}
    </div>
  );
}
