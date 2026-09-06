"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
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
              <label
                key={row.id}
                className="flex cursor-pointer gap-3 rounded-xl border bg-card p-4"
              >
                <input
                  className="mt-1 size-4"
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      checked
                        ? next.delete(row.sense.id)
                        : next.add(row.sense.id);
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
    </div>
  );
}
