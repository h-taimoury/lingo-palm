"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import { publicEnv } from "@/lib/env";
import type { Entry } from "@/types/api/dictionary";
import type { ScrapeResponse } from "@/types/api/scraper";
import { isWordNotFound, ScrapeRetriesExhausted, withScrapeRetry } from "./scrapeRetry";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

type Suggestion = {
  id: string;
  subtitle_sha256: string;
  subtitle_word: string;
  cue_id: number;
  cue_text: string;
  start_time: number;
  end_time: number;
  token_indices: number[];
  dictionary_word: string;
  scrape_term: string;
  longman_url: string;
};
type ImportResult = {
  ready?: number;
  created?: number;
  skipped: number;
  items: {
    suggestion_id: string;
    subtitle_word: string;
    cue_id: number;
    sense_ids: number[];
    status: string;
    reason: string;
  }[];
};
type Decision = "keep" | "remove";
const steps = [
  "Import suggestions",
  "Review vocabulary",
  "Prepare dictionary",
  "Export / import mappings",
];
const wordKey = (item: Suggestion) => item.dictionary_word.trim().toLowerCase();

function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function JsonInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations();

  const [fileError, setFileError] = useState("");
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        {label}
        <input
          type="file"
          accept=".json,application/json"
          disabled={disabled}
          className="mt-2 block w-full rounded-lg border p-3"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setFileError("");
            try {
              if (file.size > 5 * 1024 * 1024)
                throw new Error(t("Choose a JSON file smaller than 5 MB."));
              onChange(await file.text());
            } catch (caught) {
              setFileError(
                caught instanceof Error
                  ? caught.message
                  : "Could not read the file.",
              );
            }
            event.target.value = "";
          }}
        />
      </label>
      <label className="block text-sm font-medium">
        {t("Or paste JSON")}<textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="mt-2 min-h-48 w-full rounded-lg border bg-background p-3 font-mono text-xs"
        />
      </label>
      {fileError ? (
        <p role="alert" className="text-sm text-destructive">
          {fileError}
        </p>
      ) : null}
    </div>
  );
}

export function BulkMappingsWizard({ sectionId }: { sectionId: number }) {
  const t = useTranslations();

  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [index, setIndex] = useState(0);
  const [entries, setEntries] = useState<Record<string, Entry[]>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [finalInput, setFinalInput] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [exported, setExported] = useState(false);
  const locked = useRef(false);
  const stop = useRef(false);
  const retryController = useRef<AbortController | null>(null);
  const [stopping, setStopping] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop.current = true;
      retryController.current?.abort();
    };
  }, []);
  useUnsavedChangesWarning(
    busy || suggestions.some((item) => decisions[item.id] === "keep" && wordKey(item) in failures) ||
      (suggestions.length > 0 && !exported && !result),
  );
  const base = `/api/courses/sections/${sectionId}/bulk-mappings`;
  const accepted = suggestions.filter((item) => decisions[item.id] === "keep");
  const reviewed = suggestions.filter((item) => decisions[item.id]).length;
  const readySuggestions = accepted.filter((item) =>
    !failures[wordKey(item)] && entries[wordKey(item)]?.some((entry) => entry.senses.length),
  );
  const failedSuggestions = [...new Map(accepted.filter((item) => failures[wordKey(item)])
    .map((item) => [wordKey(item), item])).values()];
  const prepared = readySuggestions.length > 0 && accepted.every((item) =>
    failures[wordKey(item)] || entries[wordKey(item)]?.some((entry) => entry.senses.length),
  );
  const current = suggestions[index];

  async function task(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      if (mounted.current) setError(caught);
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function importSuggestions() {
    await task(async () => {
      const data = await apiClient.post<{ suggestions: Suggestion[] }>(
        `${base}/validate/`,
        { suggestions: JSON.parse(input) },
      );
      setSuggestions(data.suggestions);
      setDecisions({});
      setEntries({});
      setFailures({});
      setLogs([]);
      setPreview(null);
      setResult(null);
      setExported(false);
      setIndex(0);
      setStep(1);
    });
  }

  function decide(decision: Decision) {
    if (!current) return;
    setDecisions((previous) => ({ ...previous, [current.id]: decision }));
    setExported(false);
    setIndex((previous) => Math.min(previous + 1, suggestions.length - 1));
  }

  function continueToDictionary() {
    setDecisions((previous) => {
      const next = { ...previous };
      for (const item of suggestions) {
        next[item.id] ??= "keep";
      }
      return next;
    });
    if (reviewed !== suggestions.length) setExported(false);
    setError(null);
    setStep(2);
  }

  async function prepareDictionary(selection = accepted) {
    await task(async () => {
      stop.current = false;
      setStopping(false);
      const controller = new AbortController();
      retryController.current = controller;
      const unique = [
        ...new Map(selection.map((item) => [wordKey(item), item])).values(),
      ];
      const log = (message: string) => {
        if (mounted.current) setLogs((previous) => [...previous, message]);
      };
      let readyCount = 0;
      let failedCount = 0;
      let missingCount = 0;
      const clearFailure = (key: string) => {
        if (mounted.current) setFailures((previous) => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
      };
      // Each request finishes before the next starts; no concurrent browser scrapes.
      for (const [position, item] of unique.entries()) {
        if (stop.current || !mounted.current) {
          break;
        }
        const key = wordKey(item);
        if (entries[key]?.some((entry) => entry.senses.length)) {
          readyCount++;
          clearFailure(key);
          log(`${item.dictionary_word}: already prepared.`);
          continue;
        }
        log(
          `${position + 1}/${unique.length}: checking ${item.dictionary_word}…`,
        );
        try {
          const found = await withScrapeRetry(async () => {
            let found = (
              await apiClient.post<{ entries: Entry[] }>(`${base}/lookup/`, {
                dictionary_word: item.dictionary_word,
              })
            ).entries;
            if (controller.signal.aborted) return found;
            if (!found.length) {
              if (!publicEnv.enableScraper)
                throw new Error(
                  t("Scraping is disabled in this environment. Run this step on your local authoring server."),
                );
              log(`Scraping ${item.scrape_term}…`);
              const response = await apiClient.post<ScrapeResponse>(
                "/api/scraper/scrape/",
                { word: item.scrape_term },
              );
              found = response.entries;
              log(`${item.dictionary_word}: scraped successfully.`);
            } else {
              log(
                `${item.dictionary_word}: already in the dictionary; scraping skipped.`,
              );
            }
            return found;
          }, controller.signal, (message) => log(`${item.dictionary_word}: ${message}`));
          if (!found || (controller.signal.aborted && !found.length)) break;
          if (!found.some((entry) => entry.senses.length))
            throw new Error(
              t("No senses were returned for {0}. Review its dictionary URL.", { 0: item.dictionary_word }),
            );
          readyCount++;
          clearFailure(key);
          if (mounted.current) setExported(false);
          if (mounted.current)
            setEntries((previous) => ({ ...previous, [key]: found }));
        } catch (caught) {
          if (caught instanceof ScrapeRetriesExhausted) {
            failedCount++;
            if (mounted.current) {
              setFailures((previous) => ({ ...previous, [key]: caught.message || "Scraping failed." }));
              setExported(false);
            }
            log(`${item.dictionary_word}: failed after 4 attempts (3 retries). ${caught.message} Continuing; all occurrences excluded from export until a successful retry.`);
            continue;
          }
          if (isWordNotFound(caught)) {
            missingCount++;
            clearFailure(key);
            if (mounted.current) {
              setDecisions((previous) => {
                const next = { ...previous };
                for (const suggestion of suggestions) {
                  if (wordKey(suggestion) === key) next[suggestion.id] = "remove";
                }
                return next;
              });
              setExported(false);
            }
            log(`${item.dictionary_word}: no entry found in Longman. Skipped all occurrences.`);
            continue;
          }
          failedCount++;
          const message = caught instanceof Error ? caught.message : t("Dictionary preparation failed.");
          if (mounted.current) {
            setFailures((previous) => ({ ...previous, [key]: message }));
            setExported(false);
          }
          log(`${item.dictionary_word}: skipped after failure. ${message} Continuing; all occurrences excluded from export until a successful retry.`);
          continue;
        }
      }
      if (stop.current) log("Stopped. Completed entries are kept; continue to resume.");
      else log(`Preparation run finished: ${readyCount} prepared · ${failedCount} failed · ${missingCount} not found.`);
    });
  }

  async function exportSenses() {
    await task(async () => {
      setExported(false);
      const data = await apiClient.post(`${base}/export/`, {
        suggestions: readySuggestions,
      });
      if (!navigator.clipboard?.writeText) {
        throw new Error(t("Clipboard access is unavailable. Open this page using HTTPS or localhost and try again."));
      }
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setExported(true);
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <ol
        aria-label={t("Bulk mappings steps")}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {steps.map((label, position) => (
          <li key={label}>
            <Button
              className="h-auto w-full justify-start whitespace-normal p-3"
              variant={step === position ? "default" : "outline"}
              aria-current={step === position ? "step" : undefined}
              disabled={
                busy ||
                (position === 1 && !suggestions.length) ||
                (position === 2 && !suggestions.length)
              }
              onClick={() => {
                if (position === 2) {
                  continueToDictionary();
                  return;
                }
                setStep(position);
                setError(null);
              }}
            >
              {position + 1}. {t(label)}
            </Button>
          </li>
        ))}
      </ol>
      <ApiErrorMessage error={error} />
      {failedSuggestions.length > 0 && step >= 2 ? (
        <aside className="space-y-3 rounded-lg border p-4" aria-label={t("Failed dictionary words")}>
          <p>{t("{0} failed words are excluded from mapping export until successfully prepared.", { 0: failedSuggestions.length })}</p>
          <ul className="max-h-48 overflow-y-auto text-sm">
            {failedSuggestions.map((item) => (
              <li key={wordKey(item)}><strong>{item.dictionary_word}</strong>: {failures[wordKey(item)]}</li>
            ))}
          </ul>
          <Button disabled={busy} variant="outline" onClick={() => void prepareDictionary(failedSuggestions)}>
            {t("Retry failed words")}</Button>
        </aside>
      ) : null}
      {busy ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Working… Please keep this page open.")}</p>
      ) : null}
      <section
        className="space-y-5 rounded-xl border bg-card p-5 sm:p-7"
        aria-label={steps[step]}
      >
        <h2 className="text-xl font-semibold">{steps[step]}</h2>
        {step === 0 ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("Download this section’s subtitle context and give it to the assistant with your subtitles. Ask for B2-and-above vocabulary, selecting only the main word in each expression or phrasal verb. Use main dictionary headwords without checking URLs online. Import the resulting suggestions array here.")}</p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void task(async () =>
                  downloadJson(
                    `section-${sectionId}-subtitle-context.json`,
                    await apiClient.get(`${base}/context/`),
                  ),
                )
              }
            >
              {t("Download subtitle context")}</Button>
            <JsonInput
              label={t("Suggestions JSON file")}
              value={input}
              onChange={setInput}
              disabled={busy}
            />
            <Button
              disabled={busy || !input.trim()}
              onClick={() => void importSuggestions()}
            >
              {t("Validate and review suggestions")}</Button>
            {suggestions.length ? (
              <p className="text-sm text-muted-foreground">
                {t("Importing another file restarts this wizard’s review. Existing database mappings are never removed.")}</p>
            ) : null}
          </>
        ) : null}
        {step === 1 && current ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t("Suggestion {0} of {1} · {2} reviewed · {3} kept", { 0: index + 1, 1: suggestions.length, 2: reviewed, 3: accepted.length })}</p>
            <article className="space-y-4 rounded-xl border bg-muted/20 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-semibold">
                  {current.subtitle_word}
                </h3>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {decisions[current.id] ?? t("Not reviewed")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-lg leading-8">
                {current.cue_text}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Cue {0} · {1}s–{2}s · Token indices:", { 0: current.cue_id, 1: current.start_time, 2: current.end_time })} {current.token_indices.join(", ")}
              </p>
              <p className="text-sm">
                {t("Dictionary word:")} <strong>{current.dictionary_word}</strong>  {t("· Scrape term:")} <strong>{current.scrape_term}</strong>
              </p>
              <a
                href={current.longman_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block break-all text-sm text-primary underline underline-offset-4"
              >
                {t("Check Longman entry ↗")}</a>
            </article>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
              >
                {t("Previous")}</Button>
              <Button
                variant="outline"
                disabled={index === suggestions.length - 1}
                onClick={() => setIndex(index + 1)}
              >
                {t("Next")}</Button>
              <Button variant="destructive" onClick={() => decide("remove")}>
                {t("Remove and next")}</Button>
              <Button onClick={() => decide("keep")}>{t("Keep and next")}</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Remove excludes this occurrence only. You can return to it and choose Keep. No dictionary entries are deleted. Continuing to the dictionary automatically keeps all unreviewed words and preserves your removals.")}</p>
            <Button
              variant="outline"
              disabled={!accepted.length}
              onClick={() =>
                downloadJson(
                  `section-${sectionId}-accepted-suggestions.json`,
                  accepted,
                )
              }
            >
              {t("Save accepted suggestions")}</Button>
            <Button
              className="ms-2"
              onClick={continueToDictionary}
            >
              {t("Continue to dictionary")}</Button>
          </>
        ) : null}
        {step === 2 ? (
          <>
            {!accepted.length ? (
              <p className="text-sm text-muted-foreground">
                {t("All suggestions have been removed. Return to Review vocabulary and keep at least one word to prepare the dictionary.")}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t("Accepted occurrences share one dictionary lookup per word. Existing entries are reused; missing entries are scraped sequentially. Temporary loading or audio failures retry up to three times, after 3, 8, and 15 seconds. After these retries, failed words are recorded and preparation continues. Other failures are logged and skipped immediately without pausing. Failed words are excluded from export; you can retry them after the run finishes.")}</p>
            {!publicEnv.enableScraper ? (
              <p className="text-sm text-amber-700">
                {t("Scraping is disabled here. Existing dictionary entries can still be prepared.")}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || !accepted.length}
                onClick={() => void prepareDictionary()}
              >
                {t("Prepare / retry remaining words")}</Button>
              {busy ? (
                <Button
                  variant="outline"
                  disabled={stopping}
                  onClick={() => {
                    stop.current = true;
                    retryController.current?.abort();
                    setStopping(true);
                    setLogs((previous) => [...previous, "Stop requested. No more retries or words will start; any active request will finish first."]);
                  }}
                >
                  {stopping ? t("Stopping…") : t("Stop retries / preparation")}
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={busy || !prepared}
                onClick={() => setStep(3)}
              >
                {t("Continue to sense selection")}</Button>
            </div>
            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className="max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-sm"
            >
              {logs.length ? (
                logs.map((line, i) => (
                  <p key={i} className="py-1">
                    {line}
                  </p>
                ))
              ) : (
                <p>{t("No requests started yet.")}</p>
              )}
            </div>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("Copy the final accepted words as JSON after dictionary preparation. Paste the JSON into your chat with the assistant, who can read your dictionary database to select the correct meanings, then upload its completed mapping JSON below. You can return directly to this step later; the file contains its own section and subtitle checks.")}</p>
            <Button
              variant="outline"
              disabled={busy || !prepared}
              onClick={() => void exportSenses()}
            >
              {t("Copy accepted words for sense selection")}</Button>
            {exported ? (
              <p role="status" className="text-sm text-emerald-700">
                {t("JSON copied to clipboard. Paste it into your chat for sense selection.")}</p>
            ) : null}
            <JsonInput
              label={t("Completed mappings JSON file")}
              value={finalInput}
              onChange={(value) => {
                setFinalInput(value);
                setPreview(null);
                setResult(null);
              }}
              disabled={busy}
            />
            <Button
              variant="outline"
              disabled={busy || !finalInput.trim()}
              onClick={() =>
                void task(async () => {
                  setPreview(null);
                  setResult(null);
                  setPreview(
                    await apiClient.post<ImportResult>(
                      `${base}/preview/`,
                      JSON.parse(finalInput),
                    ),
                  );
                })
              }
            >
              {t("Validate and preview mappings")}</Button>
            {preview && !result ? (
              <div className="space-y-3">
                <p>
                  {t("{0} ready · {1} overlapping mappings skipped", { 0: preview.ready, 1: preview.skipped })}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Existing mappings are preserved. The server checks overlaps again when creating mappings.")}</p>
                <Button
                  disabled={busy || !preview.ready}
                  onClick={() =>
                    void task(async () => {
                      const imported = await apiClient.post<ImportResult>(
                        `${base}/import/`,
                        JSON.parse(finalInput),
                      );
                      setResult(imported);
                      setExported(true);
                    })
                  }
                >
                  {t("Create {0} mappings", { 0: preview.ready })}</Button>
              </div>
            ) : null}
            {result ? (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 p-4 text-emerald-900"
              >
                {t("Created {0} mappings. Skipped {1}. Existing mappings were preserved.", { 0: result.created, 1: result.skipped })}</p>
            ) : null}
            {result || preview ? (
              <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
                {(result ?? preview)!.items.map((item, index) => (
                  <li
                    key={`${item.suggestion_id}-${index}`}
                    className="rounded-lg border p-3"
                  >
                    <strong>{item.subtitle_word}</strong>  {t("· Cue {0} · {1} · Sense IDs:", { 0: item.cue_id, 1: item.status })} {item.sense_ids.join(", ")}
                    {item.reason ? (
                      <p className="text-muted-foreground">{item.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
