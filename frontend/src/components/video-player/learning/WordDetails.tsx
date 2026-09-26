"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SenseView } from "@/components/video-player/learning/SenseView";
import { apiClient } from "@/lib/api/client";
import type { Entry } from "@/types/api/dictionary";

export function WordDetails({ entryId, currentSenseId, showTranslation = false }: { entryId: number; currentSenseId: number; showTranslation?: boolean }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void apiClient.get<Entry[]>(`/api/dictionary/entries/${entryId}/full-word/?schema=level-v1`, {
      signal: controller.signal,
      cache: showTranslation ? "no-store" : "default", // Fetch current translations rather than a day-old cached response.
    })
      .then((data) => { if (!controller.signal.aborted) setEntries(data); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [entryId, attempt, showTranslation]);

  if (failed) return (
    <div className="space-y-3 py-6">
      <p role="alert" className="text-sm text-destructive">The full word could not be loaded.</p>
      <Button variant="outline" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Try again</Button>
    </div>
  );
  if (!entries) return <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Loading full word…</p>;
  if (!entries.length) return <p className="py-6 text-sm text-muted-foreground">No entries found for this word.</p>;

  return (
    <div className="space-y-8">
      {entries.map((entry) => (
        <section key={entry.id} className="border-t pt-5 first:border-0 first:pt-0" aria-label={`${entry.word}, ${entry.part_of_speech}`}>
          <div className="space-y-6">
            {entry.senses.map((sense, index) => (
              <div key={sense.id}>
                <SenseView sense={{ ...sense, entry }} learned={false} examplesMode="all" showHeader={index === 0} keyboardShortcuts={false} showMetadata showTranslation={showTranslation} translationPlacement="definition" currentSense={sense.id === currentSenseId} frequencyLabels={entry.frequency} />
              </div>
            ))}
            {!entry.senses.length ? <p className="text-sm text-muted-foreground">No senses available.</p> : null}
          </div>
        </section>
      ))}
    </div>
  );
}
