import { expect, it } from "vitest";
import type { WordSenseMapping } from "@/types/api/courses";
import { mappedSelectionKeys, selectionExport, toggleSelection, type SelectionContext } from "./bulkSelecting";

const context: SelectionContext = {
  section_id: 8, subtitle_sha256: "a".repeat(64),
  cues: [{ cue_id: 7, cue_text: "head head! head\n<i>supposed</i>", start_time: 1, end_time: 4,
    tokens: [
      { index: 0, word: "head", position_in_cue: 1 },
      { index: 1, word: "head!", position_in_cue: 1 },
      { index: 2, word: "head", position_in_cue: 2 },
      { index: 3, word: "<i>supposed</i>", position_in_cue: 1 },
    ] }],
};

it("locks only the exact mapped occurrence, distinguishing punctuation and repeated words", () => {
  const mappings = [{ subtitle_words: [{ cue_id: 7, word: "head", position_in_cue: 2 }] }] as WordSenseMapping[];
  const mapped = mappedSelectionKeys(context, mappings);
  expect([...mapped]).toEqual(["7:2"]);
  const result = selectionExport(context, { "7:0": true, "7:1": true, "7:2": true }, mapped);
  expect(result.selections.map(item => item.token_indices)).toEqual([[0], [1]]);
});

it("preserves exact metadata and surrounding context without guessing headwords", () => {
  const result = selectionExport(context, { "7:3": true }, new Set());
  expect(result).toMatchObject({ export_type: "bulk_vocabulary_selection", section_id: 8, subtitle_sha256: context.subtitle_sha256, cues: context.cues });
  expect(result.selections[0]).toEqual({ id: "manual-7-3", subtitle_word: "<i>supposed</i>", cue_id: 7, cue_text: context.cues[0].cue_text, start_time: 1, end_time: 4, token_indices: [3] });
  expect(JSON.stringify(result)).not.toContain('"review_token"');
});

it("rejects empty or fully mapped selections", () => {
  expect(() => selectionExport(context, {}, new Set())).toThrow("Select at least one");
  expect(() => selectionExport(context, { "7:0": true }, new Set(["7:0"]))).toThrow("Select at least one");
});

it("exports explicit non-adjacent groups in subtitle order without absorbing independent words", () => {
  const result = selectionExport(context, { "7:2": "phrase-1", "7:0": "phrase-1", "7:1": true, "7:3": "phrase-2" }, new Set());
  expect(result.selections.map(item => [item.subtitle_word, item.token_indices])).toEqual([
    ["head head", [0, 2]], ["head!", [1]], ["<i>supposed</i>", [3]],
  ]);
  expect(result.selections[0].id).toBe("manual-7-0-group");
  expect(result.instructions).toContain("never split it");
});

it("moves existing selections into a group without duplicates and allows removing individual members", () => {
  let selected = toggleSelection({}, "7:0");
  selected = toggleSelection(selected, "7:0", "phrase-1");
  selected = toggleSelection(selected, "7:2", "phrase-1");
  selected = toggleSelection(selected, "7:0", "phrase-2");
  expect(selectionExport(context, selected, new Set()).selections.map(item => item.token_indices)).toEqual([[0], [2]]);
  selected = toggleSelection(selected, "7:0", "phrase-2");
  selected = toggleSelection(selected, "7:2");
  expect(selected).toEqual({});
});

it("does not silently export a partial phrase when a member becomes mapped", () => {
  expect(() => selectionExport(context, { "7:0": "phrase-1", "7:2": "phrase-1" }, new Set(["7:2"]))).toThrow("now mapped");
});

it("rejects grouping across subtitle cues", () => {
  const twoCues = { ...context, cues: [...context.cues, { ...context.cues[0], cue_id: 8 }] };
  expect(() => selectionExport(twoCues, { "7:0": "phrase-1", "8:0": "phrase-1" }, new Set())).toThrow("one subtitle cue");
});
