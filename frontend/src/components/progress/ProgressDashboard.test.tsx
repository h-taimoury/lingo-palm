import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import type { LearningProgress } from "@/types/api/vocabulary";
import { ProgressDashboard } from "./ProgressDashboard";

const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, get: vi.fn(), deps: [] as unknown[],
  effect: null as (() => (() => void)) | null, cleanup: null as (() => void) | null,
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = initial;
    return [harness.slots[slot], (value: unknown) => {
      harness.slots[slot] = typeof value === "function" ? value(harness.slots[slot]) : value;
    }];
  },
  useEffect: (effect: () => (() => void), deps: unknown[]) => {
    if (deps.some((value, index) => value !== harness.deps[index])) {
      harness.deps = deps;
      harness.effect = effect;
    }
  },
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: harness.get } }));

type Element = ReactElement<{ children?: ReactNode; onClick?: () => void }>;
function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Element["props"]>(child)
    ? [child, ...elements(child.props.children)] : []);
}
function text(node: ReactNode): string {
  return Children.toArray(node).map((child) => isValidElement<Element["props"]>(child)
    ? text(child.props.children) : String(child)).join("");
}
function render() { harness.cursor = 0; return ProgressDashboard(); }
function runEffect() {
  render();
  harness.cleanup?.();
  harness.cleanup = harness.effect!();
  harness.effect = null;
}
function click(label: string) {
  const button = elements(render()).find((node) => node.type === Button && text(node.props.children) === label);
  expect(button).toBeDefined();
  button!.props.onClick!();
}
const data: LearningProgress = {
  days: 30, timezone: "UTC", start_date: "2026-10-20", end_date: "2026-11-18",
  total_learned: 12, period_learned: 8, learning_days: 4, daily_counts: [], recently_learned: [], review_due_count: 0,
};
beforeEach(() => {
  harness.cleanup?.();
  harness.slots = []; harness.cursor = 0; harness.deps = []; harness.effect = null; harness.cleanup = null;
  harness.get.mockReset();
});

it("requests the last 30 days in the browser time zone and shows a useful empty state", async () => {
  harness.get.mockResolvedValue({ ...data, total_learned: 0, period_learned: 0, learning_days: 0 });
  expect(text(render())).toContain("Loading your progress");
  runEffect();
  const query = new URL(harness.get.mock.calls[0][0], "http://localhost").searchParams;
  expect(query.get("days")).toBe("30");
  expect(query.get("timezone")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  await vi.waitFor(() => expect(text(render())).toContain("No new senses in this period yet"));
  expect(text(render())).toContain("Your first learned meaning will appear here");
  expect(text(render())).toContain("You’re all caught up");
});

it("ignores an older period response after switching to 90 days", async () => {
  let finishOld!: (value: LearningProgress) => void;
  harness.get.mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }));
  runEffect();
  const oldSignal = harness.get.mock.calls[0][1].signal as AbortSignal;
  harness.get.mockResolvedValueOnce({ ...data, days: 90 });
  click("90 days");
  runEffect();
  expect(oldSignal.aborted).toBe(true);
  await vi.waitFor(() => expect(text(render())).toContain("Over the last 90 days"));
  finishOld(data);
  await Promise.resolve();
  expect(text(render())).toContain("Over the last 90 days");
});

it("allows retrying a failed request and then displays the review action", async () => {
  harness.get.mockRejectedValueOnce(new Error("Network failed"));
  runEffect();
  await vi.waitFor(() => expect(text(render())).toContain("Try again"));
  harness.get.mockResolvedValueOnce({ ...data, review_due_count: 2 });
  click("Try again");
  runEffect();
  await vi.waitFor(() => expect(text(render())).toContain("Start review"));
  expect(harness.get).toHaveBeenCalledTimes(2);
});
