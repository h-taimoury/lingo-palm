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
  "aria-label"?: string;
  "aria-pressed"?: boolean;
}>;

function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Element["props"]>(child)
    ? [child, ...elements(child.props.children), ...elements(child.props.actions)] : []);
}

function text(node: ReactNode): string {
  return Children.toArray(node).map((child) => isValidElement<Element["props"]>(child)
    ? text(child.props.children) : String(child)).join("").replace(/\s+/g, " ");
}

const card = (id: number) => ({ id, review_version: 4, sense: { entry: { word: "book" } } }) as Vocabulary;
const batch: ReviewBatch = { results: [card(17), card(18)], due_count: 2, next_due_at: null };
const saved = {
  id: 91, submission_id: "original-review", due_at: "2026-11-18T12:10:00Z",
  reviewed_at: "2026-11-18T12:00:00Z", rating: 3, version: 5,
};

type SessionOptions = Omit<Parameters<typeof ReviewSession>[0], "initialData">;

function render(data = batch, options: SessionOptions = {}) {
  harness.cursor = 0;
  return ReviewSession({ initialData: data, ...options });
}

function button(label: string, data = batch, options: SessionOptions = {}) {
  const found = elements(render(data, options)).find((node) => node.type === Button
    && (text(node.props.children) === label || node.props["aria-label"] === label));
  expect(found, label).toBeDefined();
  return found!;
}

beforeEach(() => {
  harness.slots = [];
  harness.cursor = 0;
  harness.post.mockReset();
  harness.get.mockReset();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "b0d413d3-f941-42f6-96a8-8e747fd3de83") });
  vi.stubGlobal("window", { matchMedia: vi.fn(() => ({ matches: true })) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("allows ratings without revealing the card and leaves skipped cards unselected", () => {
  expect(button("Forgot").props.disabled).toBe(false);
  expect(button("Remembered").props.disabled).toBe(false);
  expect(button("Previous card").props.disabled).toBe(true);
  expect(button("Next card").props.disabled).toBe(false);
  button("Next card").props.onClick!();
  button("Previous card").props.onClick!();
  expect(text(render())).toContain("1 of 2");
  expect(button("Forgot").props.disabled).toBe(false);
  expect(button("Remembered").props.disabled).toBe(false);
  expect(button("Forgot").props["aria-pressed"]).toBe(false);
  expect(button("Remembered").props["aria-pressed"]).toBe(false);
  expect(harness.post).not.toHaveBeenCalled();
});

it("saves once on a double click and advances only after the save succeeds", async () => {
  let finish!: (value: unknown) => void;
  harness.post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const control = button("Remembered");
  control.props.onClick!();
  control.props.onClick!();
  expect(harness.post).toHaveBeenCalledOnce();
  expect(text(render())).toContain("1 of 2");
  finish(saved);
  await vi.waitFor(() => expect(text(render())).toContain("2 of 2"));
  expect(button("Remembered").props.disabled).toBe(false);
  expect(harness.post).toHaveBeenCalledWith("/api/my-vocabulary/vocabulary/17/review/", {
    submission_id: "b0d413d3-f941-42f6-96a8-8e747fd3de83", rating: 3, version: 4,
  });
});

it("retries a lost answer with the same submission and prevents skipping the uncertain result", async () => {
  harness.post.mockRejectedValueOnce(new Error("Network failed")).mockResolvedValueOnce(saved);
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Retry saving answer")).toBeDefined());
  expect(button("Remembered").props.disabled).toBe(true);
  expect(button("Next card").props.disabled).toBe(true);
  expect(button("Previous card").props.disabled).toBe(true);
  button("Retry saving answer").props.onClick!();
  await vi.waitFor(() => expect(text(render())).toContain("2 of 2"));
  expect(harness.post.mock.calls[1][1]).toBe(harness.post.mock.calls[0][1]);
});

it("skips without recording a review and reports it separately in the summary", () => {
  const single = { ...batch, results: [card(17)], due_count: 1 };
  button("Next card", single).props.onClick!();
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
  await vi.waitFor(() => expect(text(render())).toContain("1 of 1"));
  expect(button("Remembered").props.disabled).toBe(false);
});

it("animates navigation in both directions and blocks repeated clicks during both phases", () => {
  vi.useFakeTimers();
  vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
  const next = button("Next card");
  next.props.onClick!();
  next.props.onClick!();
  expect(text(render())).toContain("1 of 2");
  expect(button("Remembered").props.disabled).toBe(true);
  vi.advanceTimersByTime(200);
  expect(text(render())).toContain("2 of 2");
  expect(button("Next card").props.disabled).toBe(true);
  button("Forgot").props.onClick!();
  expect(harness.post).not.toHaveBeenCalled();
  vi.advanceTimersByTime(200);
  expect(button("Remembered").props.disabled).toBe(false);
  button("Previous card").props.onClick!();
  vi.advanceTimersByTime(400);
  expect(text(render())).toContain("1 of 2");
  expect(button("Previous card").props.disabled).toBe(true);
  button("Next card").props.onClick!();
  vi.advanceTimersByTime(400);
  button("Next card").props.onClick!();
  vi.advanceTimersByTime(200);
  expect(text(render())).toContain("0 remembered · 0 forgot · 2 skipped");
  expect(button("Continue reviewing").props.disabled).toBe(false);
  expect(button("Next card").props.disabled).toBe(true);
  expect(button("Previous card").props.disabled).toBe(false);
});

it("starts the exit only after the answer saves and keeps controls locked until entry ends", async () => {
  vi.useFakeTimers();
  vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
  let finish!: (value: unknown) => void;
  harness.post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  button("Remembered").props.onClick!();
  vi.advanceTimersByTime(1000);
  expect(text(render())).toContain("1 of 2");
  finish(saved);
  await Promise.resolve();
  expect(text(render())).toContain("1 of 2");
  expect(button("Next card").props.disabled).toBe(true);
  vi.advanceTimersByTime(200);
  expect(text(render())).toContain("2 of 2");
  expect(button("Remembered").props.disabled).toBe(true);
  vi.advanceTimersByTime(200);
  expect(button("Remembered").props.disabled).toBe(false);
  expect(harness.post).toHaveBeenCalledOnce();
});

it("clears or switches saved ratings in place and counts only the current selections", async () => {
  harness.post.mockImplementation(async (_path, answer) => ({
    ...saved, rating: answer.rating, version: answer.version + 1,
  }));
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(text(render())).toContain("2 of 2"));
  button("Previous card").props.onClick!();
  expect(button("Remembered").props["aria-pressed"]).toBe(true);
  expect(button("Forgot").props["aria-pressed"]).toBe(false);
  expect(button("Remembered").props.disabled).toBe(false);
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Remembered").props["aria-pressed"]).toBe(false));
  expect(button("Forgot").props["aria-pressed"]).toBe(false);
  expect(text(render())).toContain("1 of 2");
  expect(harness.post.mock.calls[1][1]).toMatchObject({ rating: null, review_id: 91, version: 5 });
  button("Forgot").props.onClick!();
  await vi.waitFor(() => expect(button("Forgot").props["aria-pressed"]).toBe(true));
  expect(harness.post.mock.calls[2][1]).toMatchObject({ rating: 1, review_id: 91, version: 6 });
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Remembered").props["aria-pressed"]).toBe(true));
  expect(button("Forgot").props["aria-pressed"]).toBe(false);
  expect(harness.post.mock.calls[3][1]).toMatchObject({ rating: 3, review_id: 91, version: 7 });
  button("Next card").props.onClick!();
  button("Next card").props.onClick!();
  expect(text(render())).toContain("1 remembered · 0 forgot · 1 skipped");
  button("Previous card").props.onClick!();
  expect(button("Remembered").props["aria-pressed"]).toBe(false);
  expect(button("Forgot").props["aria-pressed"]).toBe(false);
  expect(button("Forgot").props.disabled).toBe(false);
  button("Forgot").props.onClick!();
  await vi.waitFor(() => expect(text(render())).toContain("1 remembered · 1 forgot · 0 skipped"));
  button("Previous card").props.onClick!();
  expect(button("Forgot").props["aria-pressed"]).toBe(true);
  button("Forgot").props.onClick!();
  await vi.waitFor(() => expect(button("Forgot").props["aria-pressed"]).toBe(false));
  button("Previous card").props.onClick!();
  expect(button("Remembered").props["aria-pressed"]).toBe(true);
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Remembered").props["aria-pressed"]).toBe(false));
  button("Next card").props.onClick!();
  button("Next card").props.onClick!();
  expect(text(render())).toContain("0 remembered · 0 forgot · 2 skipped");
  expect(harness.post).toHaveBeenCalledTimes(7);
});

it("retains the saved selection on a failed correction and retries the same operation", async () => {
  harness.post.mockResolvedValueOnce(saved).mockRejectedValueOnce(new Error("Network failed"));
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(text(render())).toContain("2 of 2"));
  button("Previous card").props.onClick!();
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Retry saving answer")).toBeDefined());
  expect(button("Remembered").props["aria-pressed"]).toBe(true);
  expect(button("Forgot").props.disabled).toBe(true);
  expect(button("Next card").props.disabled).toBe(true);
  harness.post.mockResolvedValueOnce({ ...saved, rating: null, reviewed_at: null, version: 6 });
  button("Retry saving answer").props.onClick!();
  await vi.waitFor(() => expect(button("Remembered").props["aria-pressed"]).toBe(false));
  expect(harness.post.mock.calls[2][1]).toBe(harness.post.mock.calls[1][1]);
  expect(text(render())).toContain("1 of 2");
});

it("clears the previous batch's selections when loading another batch", async () => {
  const single = { ...batch, results: [card(17)], due_count: 1 };
  harness.post.mockResolvedValue(saved);
  harness.get.mockResolvedValue(single);
  button("Remembered", single).props.onClick!();
  await vi.waitFor(() => expect(text(render(single))).toContain("Batch complete"));
  button("Continue reviewing", single).props.onClick!();
  await vi.waitFor(() => expect(text(render(single))).toContain("1 of 1"));
  expect(button("Remembered", single).props["aria-pressed"]).toBe(false);
  expect(button("Forgot", single).props["aria-pressed"]).toBe(false);
  expect(button("Remembered", single).props.disabled).toBe(false);
  expect(button("Previous card", single).props.disabled).toBe(true);
});

it("shares successful schedule updates and prevents reviewing a sense removed from the list", async () => {
  const onReviewSaved = vi.fn();
  const options = { onReviewSaved, stoppedIds: [18] };
  harness.post.mockResolvedValue(saved);
  button("Remembered", batch, options).props.onClick!();
  await vi.waitFor(() => expect(onReviewSaved).toHaveBeenCalledWith(17, saved));
  expect(button("Remembered", batch, options).props.disabled).toBe(true);
  expect(button("Forgot", batch, options).props.disabled).toBe(true);
  expect(button("Next card", batch, options).props.disabled).toBe(false);
  button("Forgot", batch, options).props.onClick!();
  expect(harness.post).toHaveBeenCalledOnce();
  expect(text(render(batch, options))).toContain("This sense is no longer in your review schedule.");
});

it("can resolve an uncertain answer after its sense was removed from the list", async () => {
  harness.post.mockRejectedValueOnce(new Error("Network failed")).mockResolvedValueOnce(saved);
  button("Remembered").props.onClick!();
  await vi.waitFor(() => expect(button("Retry saving answer")).toBeDefined());
  const options = { stoppedIds: [17] };
  button("Retry saving answer", batch, options).props.onClick!();
  await vi.waitFor(() => expect(text(render(batch, options))).toContain("2 of 2"));
  expect(harness.post.mock.calls[1][1]).toBe(harness.post.mock.calls[0][1]);
});

vi.mock("@/lib/i18n/LocaleProvider", async () => {
  const { createTranslator } = await import("@/lib/i18n/messages");
  return { useLocale: () => "en", useTranslations: () => createTranslator("en") };
});
