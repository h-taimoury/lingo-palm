"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  RejectScrapeRequest,
  RejectScrapeResponse,
  ScrapeRequest,
  ScrapeResponse,
} from "@/types/api/scraper";

export function ScraperForm() {
  const [result, setResult] = useState<ScrapeResponse | null>(null);
  const [busy, setBusy] = useState<"scrape" | "reject" | null>(null);
  const [error, setError] = useState<unknown>(null);
  async function scrape(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("scrape");
    setError(null);
    setResult(null);
    try {
      const data = await apiClient.post<ScrapeResponse, ScrapeRequest>(
        "/api/scraper/scrape/",
        { word: String(form.get("word") ?? "").trim() },
      );
      setResult(data);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
    }
  }
  async function reject() {
    if (
      !result ||
      !window.confirm("Reject and delete every entry returned by this scrape?")
    )
      return;
    setBusy("reject");
    setError(null);
    try {
      const body: RejectScrapeRequest = { entry_ids: result.entry_ids };
      await apiClient.delete<RejectScrapeResponse, RejectScrapeRequest>(
        "/api/scraper/reject/",
        body,
      );
      setResult(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
    }
  }
  const detailed =
    error instanceof ApiError &&
    error.data &&
    typeof error.data === "object" &&
    !Array.isArray(error.data)
      ? (error.data as Record<string, unknown>).errors
      : null;
  return (
    <div>
      <form onSubmit={scrape} className="flex max-w-xl items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="scrape_word">Word</Label>
          <Input id="scrape_word" name="word" required placeholder="book" />
        </div>
        <Button type="submit" disabled={busy !== null}>
          {busy === "scrape" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : null}
          Scrape
        </Button>
      </form>
      <div className="mt-5">
        <ApiErrorMessage error={error} />
        {detailed ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border bg-muted p-3 text-xs">
            {JSON.stringify(detailed, null, 2)}
          </pre>
        ) : null}
      </div>
      {result ? (
        <section className="mt-7 rounded-xl border bg-card">
          <div className="border-b p-5">
            <h2 className="font-semibold">Review scraped data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The scraper has already saved these entries in Django. Keep them,
              or reject the whole returned batch.
            </p>
          </div>
          <div className="divide-y">
            {result.entries.map((entry) => (
              <div key={entry.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-lg">{entry.word}</strong>
                  <Badge variant="outline">{entry.part_of_speech}</Badge>
                </div>
                {entry.pronunciation?.text ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.pronunciation.text}
                  </p>
                ) : null}
                <div className="mt-4 space-y-3">
                  {entry.senses.map((sense) => (
                    <div key={sense.id} className="rounded-lg border p-3">
                      <p className="font-medium">{sense.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {sense.definition}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t p-5">
            <Button onClick={() => setResult(null)}>Keep entries</Button>
            <Button
              variant="destructive"
              disabled={busy !== null}
              onClick={() => void reject()}
            >
              {busy === "reject" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Reject scraped entries
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
