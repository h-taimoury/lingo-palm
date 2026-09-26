"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Languages, LoaderCircle, SkipForward } from "lucide-react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SenseView } from "@/components/video-player/learning/SenseView";
import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/api/common";
import type { Sense, UpdateSenseRequest } from "@/types/api/dictionary";

export function TranslationQueue({ initial }: { initial: PaginatedResponse<Sense> }) {
  const [queue, setQueue] = useState(initial.results);
  const [remaining, setRemaining] = useState(initial.count);
  const [saved, setSaved] = useState(0);
  const [previous, setPrevious] = useState<Sense | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const sense = reviewing ? previous : queue[0];
  const translation = sense ? drafts[sense.id] ?? sense.translation ?? "" : "";

  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [sense?.id, busy, reviewing]);

  async function loadBatch() {
    // Saving removes rows from the filtered list. Advancing page numbers would
    // skip records, so fetch the first page again after each completed batch.
    try {
      const data = await apiClient.get<PaginatedResponse<Sense>>(
        "/api/dictionary/senses/?needs_translation=true",
      );
      setQueue(data.results);
      setRemaining(data.count);
      setLoadFailed(false);
    } catch (caught) {
      setError(caught);
      setLoadFailed(true);
    }
  }

  async function reload() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try { await loadBatch(); }
    finally { locked.current = false; setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sense || !translation.trim() || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.patch<Sense, UpdateSenseRequest>(
        `/api/dictionary/senses/${sense.id}/`,
        { translation: translation.trim() },
      );
      setPrevious(updated);
      setDrafts((current) => {
        const next = { ...current };
        delete next[sense.id];
        return next;
      });
      setNotice(`Translation saved for ${sense.entry.word}.`);
      if (reviewing) {
        setReviewing(false);
      } else {
        setSaved((count) => count + 1);
        setRemaining((count) => Math.max(0, count - 1));
        setQueue(queue.slice(1));
        if (queue.length === 1) await loadBatch();
      }
    } catch (caught) {
      setError(caught);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-medium"><Languages className="size-4 text-primary" aria-hidden="true" />{remaining} remaining</span>
        <span className="text-muted-foreground">{saved} translated this session</span>
      </div>
      <p role="status" className="sr-only">{notice}</p>
      <ApiErrorMessage error={error} />

      {sense ? (
        <article key={sense.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200">
          <div className="border-b px-5 py-3 text-xs font-medium text-muted-foreground sm:px-7">
            {reviewing ? "Editing your previous translation" : "Next meaning"}
            <span className="ml-2 break-all font-normal">· {sense.title}</span>
          </div>
          <div className="p-5 sm:p-7">
            <SenseView sense={sense} learned={false} examplesMode="all" showMetadata keyboardShortcuts={false} />
          </div>
          <form onSubmit={submit} className="space-y-4 border-t bg-primary/5 p-5 sm:p-7">
            <div className="space-y-2">
              <Label htmlFor="persian-translation">Persian translation <span lang="fa" dir="rtl" className="text-base font-normal text-muted-foreground">ترجمهٔ فارسی</span></Label>
              <Input
                ref={input}
                id="persian-translation"
                lang="fa"
                dir="rtl"
                value={translation}
                disabled={busy}
                required
                autoComplete="off"
                className="h-14 bg-background px-4 text-xl md:text-xl"
                placeholder="ترجمه را اینجا بنویسید…"
                aria-describedby="translation-hint"
                onChange={(event) => setDrafts((current) => ({ ...current, [sense.id]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.nativeEvent.isComposing || event.repeat)) event.preventDefault();
                }}
              />
              <p id="translation-hint" className="text-xs text-muted-foreground">Press Enter to save {reviewing ? "and return to the queue" : "and continue"}. Skip keeps your draft in this session.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {reviewing ? (
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => { setReviewing(false); setError(null); }}>Back to queue</Button>
                ) : (
                  <>
                    <Button type="button" variant="ghost" disabled={busy || !previous} onClick={() => { setReviewing(true); setError(null); }}><ArrowLeft />Previous</Button>
                    <Button type="button" variant="outline" disabled={busy || queue.length < 2} onClick={() => {
                      setQueue([...queue.slice(1), sense]);
                      setError(null);
                      setNotice("Sense moved to the back of this batch.");
                    }}><SkipForward />Skip</Button>
                  </>
                )}
              </div>
              <Button type="submit" size="lg" disabled={busy || !translation.trim()}>
                {busy ? <LoaderCircle className="animate-spin" /> : <Check />}
                {busy ? "Saving…" : reviewing ? "Save correction" : "Save & next"}
              </Button>
            </div>
          </form>
        </article>
      ) : (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          {busy ? <LoaderCircle className="mx-auto size-8 animate-spin text-primary" /> : <Check className="mx-auto size-8 text-primary" />}
          <h2 className="mt-4 text-xl font-semibold">{busy ? "Loading next senses…" : loadFailed ? "Couldn’t load the next senses" : "All caught up!"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{loadFailed ? "Your saved translations are safe. Try loading the queue again." : busy ? "Getting your next batch ready." : "Every sense used in a section now has a translation."}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {previous ? <Button variant="outline" disabled={busy} onClick={() => { setReviewing(true); setError(null); }}><ArrowLeft />Previous</Button> : null}
            <Button variant="outline" disabled={busy} onClick={() => void reload()}>{loadFailed ? "Try again" : "Check again"}<ArrowRight /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
