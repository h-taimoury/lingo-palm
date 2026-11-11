"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Info, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { VocabularyActionsMenu } from "./VocabularyActionsMenu";
import {
  VocabularyFilterFields,
  type PriorKnowledge,
  type ReviewStatus,
} from "./VocabularyFilter";
import { LearningModal } from "@/components/video-player/learning/LearningModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";
import { parsePositivePage } from "@/lib/courses/query";
import type { TaughtSense } from "@/types/api/courses";
import type { Sense, SenseLevel } from "@/types/api/dictionary";
import type {
  Vocabulary,
  VocabularyBulkAction,
  VocabularyBulkActionRequest,
  VocabularyBulkActionResponse,
} from "@/types/api/vocabulary";

type VocabularyItem = Omit<TaughtSense, "sense"> & { sense: Sense | Vocabulary["sense"] };

const newSenseActions = [
  { action: "set_already_known", label: "Already knew" },
  { action: "set_learned", label: "Mark as learned" },
] as const;
const PAGE_SIZE = 20;
const tabClassName =
  "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm";

export function SectionVocabularyManager({
  taughtSenses,
  header,
  allLearned = false,
}: {
  taughtSenses: VocabularyItem[];
  header: ReactNode;
  allLearned?: boolean;
}) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "learned" ? "learned" : "new";
  const [items, setItems] = useState(taughtSenses);
  const [busy, setBusy] = useState(false);
  const [detailSense, setDetailSense] = useState<Sense | null>(null);
  const [loadingSenseId, setLoadingSenseId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const detailItem = items.find((item) => item.sense.id === detailSense?.id);

  useEffect(() => () => detailRequest.current?.abort(), []);

  async function openDetails({ sense }: VocabularyItem) {
    detailRequest.current?.abort();
    setLoadingSenseId(null);
    setDetailError(null);
    if ("examples" in sense) {
      setDetailSense(sense);
      return;
    }

    const controller = new AbortController();
    detailRequest.current = controller;
    setLoadingSenseId(sense.id);
    try {
      const fullSense = await apiClient.get<Sense>(`/api/dictionary/senses/${sense.id}/`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setDetailSense(fullSense);
    } catch (caught) {
      if (!controller.signal.aborted) setDetailError(caught);
    } finally {
      if (!controller.signal.aborted) setLoadingSenseId(null);
    }
  }

  async function run(action: VocabularyBulkAction, ids: number[]) {
    setBusy(true);
    try {
      const result = await apiClient.post<
        VocabularyBulkActionResponse,
        VocabularyBulkActionRequest
      >("/api/my-vocabulary/vocabulary/bulk-action/", {
        action,
        sense_ids: ids,
      });
      const rows = new Map(
        Array.isArray(result)
          ? result.map((row) => [row.sense.id, row] as const)
          : [],
      );
      const affectedIds = new Set(ids);
      setItems((current) =>
        current.map((item) => {
          if (!affectedIds.has(item.sense.id)) return item;
          const row = rows.get(item.sense.id);
          return {
            ...item,
            is_learned: row !== undefined,
            already_known: row?.already_known ?? null,
            needs_review: row?.needs_review ?? null,
          };
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  function detailsButton(item: VocabularyItem) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-3 top-3 z-10 size-8 cursor-pointer rounded-full hover:bg-accent"
        aria-label={`View details for ${item.sense.entry.word}, sense ${item.sense.sense_number ?? item.sense.id}`}
        aria-haspopup="dialog"
        aria-busy={loadingSenseId === item.sense.id}
        onClick={() => void openDetails(item)}
      >
        {loadingSenseId === item.sense.id ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Info aria-hidden="true" />}
      </Button>
    );
  }

  return (
    <div>
      {allLearned ? (
        <>
          {header}
          <SectionSenseList
            learned
            allLearned
            items={items}
            busy={busy}
            onAction={run}
            detailsButton={detailsButton}
            initialPage={parsePositivePage(searchParams.get("page") ?? undefined)}
            initialReview={searchParams.get("filter")}
            initialSource={searchParams.get("source")}
          />
        </>
      ) : (
        <Tabs.Root
          value={view}
          onValueChange={(nextView) => {
            const url = new URL(window.location.href);
            if (nextView === "learned") url.searchParams.set("view", "learned");
            else url.searchParams.delete("view");
            window.history.pushState(null, "", url);
          }}
        >
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">{header}</div>
            <Tabs.List
              aria-label="Section vocabulary"
              className="inline-flex shrink-0 flex-wrap gap-1 rounded-lg bg-muted p-1"
            >
              <Tabs.Tab value="new" className={tabClassName}>
                New senses
              </Tabs.Tab>
              <Tabs.Tab value="learned" className={tabClassName}>
                Already learned
              </Tabs.Tab>
            </Tabs.List>
          </div>
          <Tabs.Panel value="new" keepMounted className="mt-4">
            <SectionSenseList
              items={items}
              busy={busy}
              onAction={run}
              detailsButton={detailsButton}
            />
          </Tabs.Panel>
          <Tabs.Panel value="learned" keepMounted className="mt-4">
            <SectionSenseList
              learned
              items={items}
              busy={busy}
              onAction={run}
              detailsButton={detailsButton}
            />
          </Tabs.Panel>
        </Tabs.Root>
      )}
      <ApiErrorMessage error={detailError} />
      {detailItem && detailSense ? (
        <LearningModal
          presentation="section-vocabulary"
          items={[
            {
              mappingId: detailItem.sense.id,
              mappingLabel: detailItem.sense.entry.word,
              sense: detailSense,
            },
          ]}
          activeIndex={0}
          learnedSenseIds={
            new Set(detailItem.is_learned ? [detailItem.sense.id] : [])
          }
          knownSenseIds={
            new Set(detailItem.already_known ? [detailItem.sense.id] : [])
          }
          onClose={() => setDetailSense(null)}
        />
      ) : null}
    </div>
  );
}

function SectionSenseList({
  items,
  busy,
  onAction,
  detailsButton,
  learned = false,
  allLearned = false,
  initialPage = 1,
  initialReview,
  initialSource,
}: {
  items: VocabularyItem[];
  busy: boolean;
  onAction: (action: VocabularyBulkAction, ids: number[]) => Promise<void>;
  detailsButton: (item: VocabularyItem) => ReactNode;
  learned?: boolean;
  allLearned?: boolean;
  initialPage?: number;
  initialReview?: string | null;
  initialSource?: string | null;
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(initialPage);
  const [level, setLevel] = useState<SenseLevel | "all">("all");
  const [review, setReview] = useState<ReviewStatus>(initialReview === "review" || initialReview === "stable" ? initialReview : "all");
  const [source, setSource] = useState<PriorKnowledge>(initialSource === "known" || initialSource === "here" ? initialSource : "all");
  const [showShortTranslation, setShowShortTranslation] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsId = useId();
  const controlsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          item.is_learned === learned &&
          (level === "all" || item.sense.level === level) &&
          (review === "all" || item.needs_review === (review === "review")) &&
          (source === "all" || item.already_known === (source === "known")),
      ),
    [items, learned, level, review, source],
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
  );
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const label = learned ? "Already learned" : "New senses";
  const senseType = learned ? "learned" : "new";
  const emptyMessage = learned
    ? level === "all" && review === "all" && source === "all"
      ? "Nothing learned here yet."
      : "No learned senses match these filters."
    : level === "all"
      ? "You have learned every sense taught in this section."
      : "No new senses at this level.";

  function resetSelection() {
    setSelected(new Set());
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    requestAnimationFrame(() => {
      const controls = controlsRef.current;
      const cards = cardsRef.current;
      if (!controls || !cards) return;
      const stickyTop = Number.parseFloat(getComputedStyle(controls).top) || 0;
      window.scrollTo({
        top:
          window.scrollY +
          cards.getBoundingClientRect().top -
          controls.getBoundingClientRect().height -
          stickyTop -
          16,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
  }

  async function applyAction(action: VocabularyBulkAction) {
    if (busy || !selected.size) return;
    setError(null);
    try {
      await onAction(action, [...selected]);
      setSelected(new Set());
    } catch (caught) {
      setError(caught);
    }
  }

  return (
    <section>
      {!allLearned ? (
        <div>
          <h2 className="text-xl font-semibold">{label}</h2>
          {learned ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Current saved state from your vocabulary.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose senses, then tell LingoPalm whether you learned them here
                or already knew them.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Know most of a level? Select all, unselect unfamiliar senses, then
                choose Already knew.
              </p>
            </>
          )}
        </div>
      ) : null}
      <div
        ref={controlsRef}
        className="sticky top-[calc(4rem+1px)] z-20 mt-4 flex flex-wrap items-end justify-between gap-4 border-b bg-background py-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-9 rounded-full border transition-colors ${showControls ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" : "border-border text-muted-foreground hover:bg-accent"}`}
            aria-label={showControls ? "Hide controls" : "Show controls"}
            title={showControls ? "Hide controls" : "Show controls"}
            aria-expanded={showControls}
            aria-controls={controlsId}
            onClick={() => setShowControls((visible) => !visible)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </Button>
          <p
            className="text-sm tabular-nums text-muted-foreground"
            role="status"
          >
            {selected.size} {senseType} senses selected across all pages
          </p>
          <VocabularyActionsMenu
            actions={learned ? undefined : newSenseActions}
            disabled={!selected.size}
            busy={busy}
            onAction={(action) => void applyAction(action)}
            align="end"
          />
        </div>
        <div
          id={controlsId}
          hidden={!showControls}
          className={`${showControls ? "flex" : "hidden"} w-full flex-wrap items-center gap-x-8 gap-y-4`}
        >
          <label className="flex items-center gap-3 text-sm font-medium">
            Level
            <select
              value={level}
              disabled={busy}
              onChange={(event) => {
                setLevel(event.target.value as SenseLevel | "all");
                resetSelection();
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="all">All levels</option>
              <option value="A">Beginner</option>
              <option value="B">Intermediate</option>
              <option value="C">Advanced</option>
            </select>
          </label>
          {learned ? (
            <VocabularyFilterFields
              value={review}
              source={source}
              disabled={busy}
              onChange={(nextReview, nextSource) => {
                setReview(nextReview);
                setSource(nextSource);
                resetSelection();
              }}
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              busy || !filtered.length || selected.size === filtered.length
            }
            onClick={() =>
              setSelected(new Set(filtered.map((item) => item.sense.id)))
            }
          >
            Select all ({filtered.length})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy || !selected.size}
            onClick={() => setSelected(new Set())}
          >
            Unselect all
          </Button>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showShortTranslation}
              onChange={(event) =>
                setShowShortTranslation(event.target.checked)
              }
              className="size-4 cursor-pointer accent-primary"
            />
            Show short translation
          </label>
        </div>
      </div>
      <div className="mt-4">
        <ApiErrorMessage error={error} />
      </div>
      {filtered.length ? (
        <div
          ref={cardsRef}
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((item) => (
            <SenseCard
              key={item.sense.id}
              item={item}
              selected={selected.has(item.sense.id)}
              disabled={busy}
              showShortTranslation={showShortTranslation}
              onToggle={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(item.sense.id)) next.delete(item.sense.id);
                  else next.add(item.sense.id);
                  return next;
                })
              }
              details={detailsButton(item)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}
      {filtered.length > 0 ? (
        <div className="sticky bottom-0 z-20 mt-4 border-t bg-background py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SensePagination
            label={label}
            senseType={senseType}
            page={currentPage}
            count={filtered.length}
            onPageChange={changePage}
          />
        </div>
      ) : null}
    </section>
  );
}

function SensePagination({
  label,
  senseType,
  page,
  count,
  onPageChange,
}: {
  label: string;
  senseType: "new" | "learned";
  page: number;
  count: number;
  onPageChange: (page: number) => void;
}) {
  if (count === 0) return null;
  const pages = Math.ceil(count / PAGE_SIZE);
  return (
    <nav
      aria-label={`${label} pagination`}
      className="flex w-full flex-wrap items-center gap-3"
    >
      <div className="grid shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">
          {count}
          {"\u2013"}
          {count} of {count} {senseType} senses
          {pages > 1 ? ` \u00b7 Page ${pages} of ${pages}` : ""}
        </span>
        <p className="col-start-1 row-start-1" role="status">
          {(page - 1) * PAGE_SIZE + 1}
          {"\u2013"}
          {Math.min(page * PAGE_SIZE, count)} of {count} {senseType} senses
          {pages > 1 ? ` \u00b7 Page ${page} of ${pages}` : ""}
        </p>
      </div>
      {pages > 1 ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === pages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </nav>
  );
}

function SenseCard({
  item,
  selected = false,
  disabled = false,
  showShortTranslation = false,
  onToggle,
  details,
}: {
  item: VocabularyItem;
  selected?: boolean;
  disabled?: boolean;
  showShortTranslation?: boolean;
  onToggle?: () => void;
  details: ReactNode;
}) {
  const { sense } = item;
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const definitionRef = useRef<HTMLParagraphElement>(null);
  const definitionId = useId();

  useEffect(() => {
    const element = definitionRef.current;
    if (!element || expanded) return;
    const measure = () =>
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [sense.definition, sense.lex_unit, expanded]);

  const heading = (
    <span
      className="block min-w-0 truncate leading-6"
      title={`${sense.entry.word} ${sense.entry.part_of_speech}${sense.sense_number != null ? ` - Sense ${sense.sense_number}` : ""}`}
    >
      <strong>{sense.entry.word}</strong>{" "}
      <span className="text-sm italic text-muted-foreground">
        {sense.entry.part_of_speech}
      </span>{" "}
      {sense.sense_number != null ? (
        <span className="text-xs text-muted-foreground">
          Sense {sense.sense_number}
        </span>
      ) : null}
    </span>
  );

  return (
    <article
      className={`relative min-w-0 ${item.is_learned && showShortTranslation ? "h-56" : item.is_learned || showShortTranslation ? "h-48" : "h-40"} ${expanded ? "z-10" : ""}`}
    >
      <div
        className={`absolute inset-x-0 top-0 min-h-full rounded-xl border bg-card p-4 ${expanded ? "shadow-xl" : "shadow-sm"} ${selected ? "border-primary ring-1 ring-primary" : ""}`}
      >
        <div className="pr-8">
          {onToggle ? (
            <label
              className={`flex min-w-0 items-center gap-2 after:absolute after:inset-0 ${disabled ? "cursor-wait" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={onToggle}
                className="size-4 shrink-0 cursor-inherit accent-primary"
              />
              {heading}
            </label>
          ) : (
            heading
          )}
        </div>
        {details}
        {showShortTranslation ? (
          <p
            dir="auto"
            className="mt-2 h-6 truncate text-sm leading-6 text-muted-foreground"
            title={sense.short_translation?.trim() || undefined}
          >
            {sense.short_translation?.trim()}
          </p>
        ) : null}
        <div className={`mt-2 ${expanded ? "" : "h-[4.5rem]"}`}>
          <p
            ref={definitionRef}
            id={definitionId}
            className={`break-words text-sm leading-6 ${expanded ? "" : "line-clamp-3"}`}
          >
            {sense.lex_unit?.trim() ? (
              <>
                <span className="rounded bg-primary/10 px-1 py-0.5 font-medium text-primary">
                  {sense.lex_unit}
                </span>{" "}
              </>
            ) : null}
            {sense.definition}
          </p>
        </div>
        <div className="h-5">
          {overflows ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={definitionId}
              onClick={() => setExpanded(!expanded)}
              className="relative z-10 cursor-pointer rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expanded ? "Show less" : "Show more..."}
            </button>
          ) : null}
        </div>
        {item.is_learned ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.already_known ? (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                Already knew
              </Badge>
            ) : (
              <Badge variant="outline">Learned</Badge>
            )}
            {item.needs_review ? (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                Needs review
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
