"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LoaderCircle, MoreHorizontal } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { LearningModal } from "@/components/video-player/learning/LearningModal";
import type { Sense } from "@/types/api/dictionary";
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
  const [refreshing, startTransition] = useTransition();
  const mutationPending = useRef(false);
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
    const senseIds = [...selected];
    if (!senseIds.length || mutationPending.current || refreshing) return;
    mutationPending.current = true;
    setBusy(action);
    setError(null);
    try {
      await apiClient.post<
        VocabularyBulkActionResponse,
        VocabularyBulkActionRequest
      >("/api/my-vocabulary/vocabulary/bulk-action/", {
        action,
        sense_ids: senseIds,
      });
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught);
    } finally {
      mutationPending.current = false;
      setBusy(null);
    }
  }
  return (
    <div>
      <ApiErrorMessage error={error} />
      {rows.length ? (
        <div
          role="group"
          aria-label="Actions for selected vocabulary"
          className="sticky top-[calc(4rem+1px)] z-30 flex flex-wrap gap-2 border-b bg-background py-8"
        >
          <Menu.Root modal={false}>
            <Menu.Trigger
              openOnHover={false}
              disabled={!selected.size || busy !== null || refreshing}
              render={<Button type="button" variant="outline" className="text-base" />}
            >
              {busy !== null || refreshing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              Actions for selected
              <ChevronDown className="size-4" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={12} className="z-50">
                <Menu.Popup className="w-60 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
                  {actions.map(({ action, label, variant }) => (
                    <Fragment key={action}>
                      {variant === "destructive" ? <Menu.Separator className="my-1 h-px bg-border" /> : null}
                      <Menu.Item
                        disabled={!selected.size || busy !== null || refreshing}
                        onClick={() => void run(action)}
                        className={`flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${variant === "destructive" ? "text-destructive data-[highlighted]:bg-destructive/10" : "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"}`}
                      >
                        {label}
                      </Menu.Item>
                    </Fragment>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <span role="status" className="self-center text-sm text-muted-foreground">{selected.size} selected</span>
        </div>
      ) : null}
      {rows.length ? (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => {
            const checked = selected.has(row.sense.id);
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-xl border bg-card"
              >
                <div className="min-w-0 flex-1 p-4">
                <label className="flex cursor-pointer gap-3">
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
                </span>
                </label>
                {row.already_known || row.needs_review ? (
                <div className="ml-7 mt-3 flex cursor-default flex-wrap gap-2 text-xs font-medium">
                  {row.already_known ? (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">Already knew</span>
                  ) : null}
                  {row.needs_review ? (
                    <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">Needs review</span>
                  ) : null}
                </div>
                ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mr-4 shrink-0 rounded-full hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_8%)] dark:hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_8%)]"
                  aria-label={`View sense details for ${row.sense.entry.word}, sense ${row.sense.sense_number ?? row.sense.id}`}
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
