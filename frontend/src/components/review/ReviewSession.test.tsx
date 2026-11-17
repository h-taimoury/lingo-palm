import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ReviewSession } from "./ReviewSession";
import { ApiError } from "@/lib/api/errors";
import type { ReviewBatch, Vocabulary } from "@/types/api/vocabulary";

const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, post: vi.fn(), get: vi.fn(),
}));

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: () => {},
  useRef: (current: unknown) => {
    const slot = harness.cursor++;
    return harness.slots[slot] ??= { current };
  },
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = initial;
    return [harness.slots[slot], (value: unknown) => {
      harness.slots[slot] = typeof value === "function" ? value(harness.slots[slot]) : value;
    }];
  },
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { post: harness.post, get: harness.get } }));
vi.mock("./useReviewMedia", () => ({
  useReviewMedia: () => ({ playPronunciation: vi.fn(), openClips: vi.fn(), media: null }),
}));

type Element = ReactElement<{
  children?: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}>;

function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Element["props"]>(child)
    ? [child, ...elements(child.props.children), ...elements(child.props.actions)] : []);
}

function text(node: ReactNode): string {
  return Children.toArray(node).map((child) => isValidElement<Element["props"]>(child)
    ? text(child.props.children) : String(child)).join("");
}

const card = (id: number) => ({ id, review_version: 4, sense: { entry: { word: "book" } } }) as Vocabulary;
const batch: ReviewBatch = { results: [card(17), card(18)], due_count: 2, next_due_at: null };
const saved = { due_at: "2026-11-18T12:10:00Z", rating: 3, version: 5 };

function render(data = batch) {
  harness.cursor = 0;
  return ReviewSession({ initialData: data });
}

function button(label: string, data = batch) {
  const found = elements(render(data)).find((node) => node.type === Button && text(node.props.children) === label);
  expect(found, label).toBeDefined();
  return found!;
}

beforeEach(() => {
  harness.slots = [];
  harness.cursor = 0;
  harness.post.mockReset();
  harness.get.mockReset();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "b0d413d3-f941-42f6-96a8-8e747fd3de83") });
});
afterEach(() => vi.unstubAllGlobals());

it("saves once on a double click and advances only after the save succeeds", async () => {
  let finish!: (value: unknown) => void;
  harness.post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const control = button("Remembered");
  control.props.onClick!();
  control.props.onClick!();
  expect(harness.post).toHaveBeenCalledOnce();
  expect(text(render())).toContain("Card 1 of 2");
  finish(saved);
  await vi.waitFor(() => expect(text(render())).toContain("Card 2 of 2"));
  expect(harness.post).toHaveBeenCalledWith("/api/my-vocabulary/vocabulary/17/review/", {
    submission_id: "b0d413d3-f941-42f6-96a8-8e747fd3de83", rating: 3, version: 4,
  });
});

it("retries a lost answer with the same submission and prevents skipping the uncertain result", async () => {
  harness.post.mockRejectedValueOnce(new Error("Network failed")).mockResolvedValueOnce(saved);
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Retry saving answer")).toBeDefined());
  expect(button("Remembered").props.disabled).toBe(true);
  expect(button("Skip for now").props.disabled).toBe(true);
  button("Retry saving answer").props.onClick!();
  await vi.waitFor(() => expect(text(render())).toContain("Card 2 of 2"));
  expect(harness.post.mock.calls[1][1]).toBe(harness.post.mock.calls[0][1]);
});

it("skips without recording a review and reports it separately in the summary", () => {
  const single = { ...batch, results: [card(17)], due_count: 1 };
  button("Skip for now", single).props.onClick!();
  expect(harness.post).not.toHaveBeenCalled();
  expect(text(render(single))).toContain("0 remembered · 0 forgot · 1 skipped");
});

it("recovers from a stale card by loading a fresh batch", async () => {
  harness.post.mockRejectedValueOnce(new ApiError({ status: 409, message: "Updated elsewhere" }));
  harness.get.mockResolvedValueOnce({ ...batch, results: [card(19)] });
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Load a new batch")).toBeDefined());
  expect(elements(render()).some((node) => text(node.props.children) === "Retry saving answer")).toBe(false);
  button("Load a new batch").props.onClick!();
  await vi.waitFor(() => expect(text(render())).toContain("Card 1 of 1"));
  expect(button("Remembered").props.disabled).toBe(false);
});
