import { expect, it } from "vitest";
import type { WordSenseMapping } from "@/types/api/courses";
import { mappedSelectionKeys, selectionExport, type SelectionContext } from "./bulkSelecting";

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
