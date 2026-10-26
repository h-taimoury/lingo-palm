import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import type { SelectionContext } from "@/lib/subtitles/bulkSelecting";

const harness = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void | (() => void))[], get: vi.fn() }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const i = harness.cursor++;
    if (!(i in harness.slots)) harness.slots[i] = initial;
    return [harness.slots[i], (next: unknown) => {
      harness.slots[i] = typeof next === "function" ? next(harness.slots[i]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const i = harness.cursor++;
    if (!(i in harness.slots)) harness.slots[i] = { current: initial };
    return harness.slots[i];
  },
  useEffect: (effect: () => void | (() => void)) => { harness.effects.push(effect); },
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: harness.get } }));
vi.mock("./useUnsavedChangesWarning", () => ({ useUnsavedChangesWarning: () => {} }));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
vi.mock("@/components/shared/ApiErrorMessage", () => ({ ApiErrorMessage: "error" }));
import { BulkSelecting } from "./BulkSelecting";

type Element = ReactElement<{ children?: ReactNode; onClick?: (event: { ctrlKey: boolean; metaKey: boolean }) => void; disabled?: boolean; className?: string; "aria-label"?: string }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  return [node as Element, ...elements((node as Element).props.children)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return node && typeof node === "object" && "props" in node ? text((node as Element).props.children) : "";
}
const context: SelectionContext = {
  section_id: 8, subtitle_sha256: "a".repeat(64),
  cues: [1, 2].map(cue_id => ({ cue_id, cue_text: "keep them out now", start_time: cue_id, end_time: cue_id + 1,
    tokens: ["keep", "them", "out", "now"].map((word, index) => ({ index, word, position_in_cue: 1 })),
  })),
};
let surface: EventTarget;
let cleanups: (() => void)[];
function render() {
  harness.cursor = 0;
  harness.effects = [];
  return BulkSelecting({ sectionId: 8, mappings: [] });
}
function word(label: string) {
  return elements(render()).find(el => el.props["aria-label"]?.split(" (")[0] === label)!;
}
function click(label: string, ctrlKey = false, metaKey = false) {
  const button = word(label);
  expect(button.props.disabled).toBeFalsy();
  button.props.onClick!({ ctrlKey, metaKey });
}
function release(key = "Control") {
  surface.dispatchEvent(Object.assign(new Event("keyup"), { key }));
}
beforeEach(async () => {
  harness.slots = [];
  harness.get.mockResolvedValue(context);
  surface = new EventTarget();
  vi.stubGlobal("window", surface);
  render();
  cleanups = harness.effects.map(effect => effect()).filter((value): value is () => void => typeof value === "function");
  await Promise.resolve();
});
afterEach(() => {
  cleanups.forEach(cleanup => cleanup());
  vi.unstubAllGlobals();
});

it("visually groups Ctrl-clicked words, keeps the highlight after release, and starts a distinct next group", () => {
  click("keep", true);
  click("out", true);
  expect(word("keep").props.className).toBe(word("out").props.className);
  expect(word("keep").props["aria-label"]).toBe("keep (group 1)");
  expect(word("them").props["aria-label"]).toBe("them");
  release();
  expect(word("out").props["aria-label"]).toBe("out (group 1)");
  click("them", true);
  click("now", true);
  expect(word("them").props["aria-label"]).toBe("them (group 2)");
  expect(word("them").props.className).not.toBe(word("keep").props.className);
  expect(text(render())).toContain("Group 1: keep … out");
  expect(text(render())).toContain("Group 2: them … now");
  click("out");
  expect(word("out").props["aria-label"]).toBe("out");
  expect(word("keep").props["aria-label"]).toBe("keep (group 1)");
});

it("supports Cmd and ends a grouping gesture on window blur or cue navigation", () => {
  click("keep", false, true);
  click("out", false, true);
  release("Meta");
  click("them", false, true);
  expect(word("them").props["aria-label"]).toBe("them (group 2)");
  surface.dispatchEvent(new Event("blur"));
  click("now", true);
  expect(word("now").props["aria-label"]).toBe("now (group 3)");
  const next = elements(render()).find(el => text(el.props.children) === "Next (F)")!;
  next.props.onClick!({ ctrlKey: true, metaKey: false });
  click("keep", true);
  expect(word("keep").props["aria-label"]).toBe("keep (group 4)");
});
