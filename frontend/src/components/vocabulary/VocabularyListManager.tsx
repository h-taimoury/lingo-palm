"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MoreHorizontal } from "lucide-react";
import { LearningModal } from "@/components/video-player/learning/LearningModal";
import type { Sense } from "@/types/api/dictionary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import type {
  Vocabulary,
  VocabularyBulkAction,
  VocabularyBulkActionRequest,
  VocabularyBulkActionResponse,
} from "@/types/api/vocabulary";

export function VocabularyListManager({
  rows,
  actions,
}: {
  rows: Vocabulary[];
  actions: {
    action: VocabularyBulkAction;
    label: string;
    variant?: "default" | "outline" | "destructive";
  }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState<VocabularyBulkAction | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [detail, setDetail] = useState<{ row: Vocabulary; sense: Sense } | null>(null);
  const [loadingSenseId, setLoadingSenseId] = useState<number | null>(null);
  const detailRequest = useRef<AbortController | null>(null);

  useEffect(() => () => detailRequest.current?.abort(), []);

  async function showDetails(row: Vocabulary) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setLoadingSenseId(row.sense.id);
    setError(null);
    try {
      const sense = await apiClient.get<Sense>(`/api/dictionary/senses/${row.sense.id}/`, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setDetail({ row, sense });
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught);
    } finally {
      if (!controller.signal.aborted) setLoadingSenseId(null);
    }
  }
  async function run(action: VocabularyBulkAction) {
    if (!selected.size) return;
    setBusy(action);
    setError(null);
    try {
      await apiClient.post<
        VocabularyBulkActionResponse,
        VocabularyBulkActionRequest
      >("/api/my-vocabulary/vocabulary/bulk-action/", {
        action,
        sense_ids: [...selected],
      });
      setSelected(new Set());
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div>
      <ApiErrorMessage error={error} />
      {rows.length ? (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => {
            const checked = selected.has(row.sense.id);
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-xl border bg-card"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer gap-3 rounded-xl p-4">
                <input
                  className="mt-1 size-4"
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked) next.delete(row.sense.id);
                      else next.add(row.sense.id);
                      return next;
                    })
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <strong>{row.sense.entry.word}</strong>
                    <span className="text-sm italic text-muted-foreground">
                      {row.sense.entry.part_of_speech}
                    </span>
                    {row.sense.sense_number ? (
                      <span className="text-xs text-muted-foreground">
                        Sense {row.sense.sense_number}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 block text-sm leading-6">
                    {row.sense.definition}
                  </span>
                  <span className="mt-3 flex gap-2">
                    <Badge variant="outline">
                      {row.already_known ? "Already knew" : "Learned"}
                    </Badge>
                    <Badge variant={row.needs_review ? "secondary" : "outline"}>
                      {row.needs_review ? "Needs review" : "Review off"}
                    </Badge>
                  </span>
                </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mr-4 shrink-0 rounded-full hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_8%)] dark:hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_8%)]"
                  aria-label={`View details for ${row.sense.entry.word}, sense ${row.sense.sense_number ?? row.sense.id}`}
                  aria-haspopup="dialog"
                  aria-busy={loadingSenseId === row.sense.id}
                  onClick={() => void showDetails(row)}
                >
                  {loadingSenseId === row.sense.id ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">
          No senses in this list.
        </p>
      )}
      {rows.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map(({ action, label, variant = "outline" }) => (
            <Button
              key={action}
              variant={variant}
              disabled={!selected.size || busy !== null}
              onClick={() => void run(action)}
            >
              {busy === action ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {label}
            </Button>
          ))}
        </div>
      ) : null}
      {detail ? (
        <LearningModal
          presentation="section-vocabulary"
          items={[{ mappingId: detail.sense.id, mappingLabel: detail.sense.entry.word, sense: detail.sense }]}
          activeIndex={0}
          learnedSenseIds={new Set([detail.sense.id])}
          knownSenseIds={new Set(detail.row.already_known ? [detail.sense.id] : [])}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </div>
  );
}
