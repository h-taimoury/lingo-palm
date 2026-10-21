import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { ApiError } from "@/lib/api/errors";

// Drive the component's event handlers with persistent hook state, without a DOM.
const harness = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, post: vi.fn() }));
vi.mock("react", async (original) => ({
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
  useEffect: () => {},
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { post: harness.post } }));
vi.mock("@/lib/env", () => ({ publicEnv: { enableScraper: true } }));
vi.mock("./useUnsavedChangesWarning", () => ({ useUnsavedChangesWarning: () => {} }));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
vi.mock("@/components/shared/ApiErrorMessage", () => ({ ApiErrorMessage: "error" }));
import { BulkMappingsWizard } from "./BulkMappingsWizard";

type Element = ReactElement<{ children?: ReactNode; onClick?: () => void; disabled?: boolean; role?: string }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const el = node as Element;
  return [el, ...elements(el.props.children)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (node && typeof node === "object" && "props" in node) return text((node as Element).props.children);
  return "";
}
function render() {
  harness.cursor = 0;
  return BulkMappingsWizard({ sectionId: 1 });
}
async function click(label: string) {
  const button = elements(render()).find(el => el.type === "button" && text(el.props.children) === label);
  expect(button, label).toBeDefined();
  expect(button!.props.disabled).toBeFalsy();
  button!.props.onClick!();
  await vi.runAllTimersAsync();
}
const suggestions = [
  { id: "a", dictionary_word: "broken", scrape_term: "broken", token_indices: [0] },
  { id: "b", dictionary_word: "broken", scrape_term: "broken", token_indices: [1] },
  { id: "c", dictionary_word: "good", scrape_term: "good", token_indices: [2] },
];
const entries = [{ id: 1, senses: [{ id: 1 }] }];
const failure = () => new ApiError({ message: "Audio unavailable", status: 502, data: { retryable: true } });

beforeEach(() => {
  vi.useFakeTimers();
  harness.slots = [];
  harness.cursor = 0;
  harness.post.mockReset();
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  vi.stubGlobal("document", { createElement: () => ({ click: vi.fn() }) });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  render();
  harness.slots[1] = "[]";
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("continues after exhausted retries, excludes all failed occurrences from export, and restores them on retry", async () => {
  let recover = false;
  harness.post.mockImplementation(async (url: string, data: { word?: string }) => {
    if (url.endsWith("/validate/")) return { suggestions };
    if (url.endsWith("/lookup/")) return { entries: [] };
    if (url.endsWith("/scrape/")) {
      if (data.word === "broken" && !recover) throw failure();
      return { entries };
    }
    return {};
  });
  await click("Validate and review suggestions");
  await click("Continue to dictionary");
  await click("Prepare / retry remaining words");
  expect(harness.post.mock.calls.filter(([url]) => url.endsWith("/scrape/"))).toHaveLength(5);
  expect(text(render())).toContain("1 prepared · 1 failed");
  expect(text(render())).toContain("Audio unavailable");
  await click("Continue to sense selection");
  await click("Copy accepted words for sense selection");
  expect(harness.post).toHaveBeenLastCalledWith(expect.stringContaining("/export/"), { suggestions: [suggestions[2]] });
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("{}");
  expect(text(render())).toContain("JSON copied to clipboard.");
  vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("Clipboard blocked"));
  await click("Copy accepted words for sense selection");
  expect(text(render())).not.toContain("JSON copied to clipboard.");
  recover = true;
  await click("Retry failed words");
  expect(text(render())).not.toContain("Retry failed words");
  await click("Copy accepted words for sense selection");
  expect(harness.post).toHaveBeenLastCalledWith(expect.stringContaining("/export/"), { suggestions });
});

it.each([500, 502, 400, 404])("skips non-retryable HTTP %s failures and exports only successful words", async (status) => {
  harness.post.mockImplementation(async (url: string, data: { word?: string }) => {
    if (url.endsWith("/validate/")) return { suggestions };
    if (url.endsWith("/lookup/")) return { entries: [] };
    if (url.endsWith("/scrape/")) {
      if (data.word === "broken") throw new ApiError({ message: "Unexpected error", status });
      return { entries };
    }
    return {};
  });
  await click("Validate and review suggestions");
  await click("Continue to dictionary");
  await click("Prepare / retry remaining words");
  expect(harness.post.mock.calls.filter(([url]) => url.endsWith("/scrape/"))).toHaveLength(2);
  expect(text(render())).not.toContain("Queue paused");
  expect(text(render())).toContain("skipped after failure. Unexpected error");
  expect(text(render())).toContain("1 prepared · 1 failed");
  await click("Continue to sense selection");
  await click("Copy accepted words for sense selection");
  expect(harness.post).toHaveBeenLastCalledWith(expect.stringContaining("/export/"), { suggestions: [suggestions[2]] });
});

it("continues after a word returns no senses", async () => {
  harness.post.mockImplementation(async (url: string, data: { word?: string }) => {
    if (url.endsWith("/validate/")) return { suggestions };
    if (url.endsWith("/lookup/")) return { entries: [] };
    if (url.endsWith("/scrape/")) return data.word === "broken" ? { entries: [{ id: 1, senses: [] }] } : { entries };
    return {};
  });
  await click("Validate and review suggestions");
  await click("Continue to dictionary");
  await click("Prepare / retry remaining words");
  expect(text(render())).toContain("1 prepared · 1 failed");
  expect(text(render())).toContain("No senses were returned");
  await click("Continue to sense selection");
});
