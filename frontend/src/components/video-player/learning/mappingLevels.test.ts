import { describe, expect, it } from "vitest";
import { filterMappingsByLevel, SENSE_LEVELS } from "./mappingLevels";
import { getCueLearningItems } from "./learningItems";
import { annotateCuesWithMappings, parseVtt } from "@/lib/subtitles";
import type { WordSenseMapping } from "@/types/api/courses";
import type { Sense } from "@/types/api/dictionary";

const cues = parseVtt("WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nbook read page").cues;

function mapping(id: number, word: string, levels: Sense["level"][]): WordSenseMapping {
  return {
    id,
    created_at: "",
    senses: levels.map((level, index) => ({ id: id * 10 + index, level, entry: { word } }) as Sense),
    subtitle_words: [{ id, mapping: id, word, cue_id: cues[0].cueId, position_in_cue: 1,
      cue_start_time: 0, cue_end_time: 2, previous_cue_start_time: null,
      previous_cue_end_time: null, next_cue_start_time: null, next_cue_end_time: null }],
  };
}

describe("mapping level visibility", () => {
  const mappings = [mapping(1, "book", ["A"]), mapping(2, "read", ["A", "C"]), mapping(3, "page", ["B"])];

  it("defaults to every mapping, including ungraded and older API payloads", () => {
    const all = [...mappings, mapping(4, "old", [null]), mapping(5, "legacy", [undefined])];
    expect(filterMappingsByLevel(all, SENSE_LEVELS)).toBe(all);
  });

  it.each([
    [["A"], [1, 2]], [["B"], [3]], [["C"], [2]],
    [["A", "B"], [1, 2, 3]], [["B", "C"], [2, 3]], [["A", "C"], [1, 2]], [[], []],
  ] as const)("shows mappings with at least one sense in %j", (levels, expected) => {
    expect(filterMappingsByLevel(mappings, levels).map((item) => item.id)).toEqual(expected);
  });

  it("keeps all linked senses on an eligible mapping and does not mutate source data", () => {
    const filtered = filterMappingsByLevel(mappings, ["C"]);
    expect(filtered[0]).toBe(mappings[1]);
    expect(filtered[0].senses.map((sense) => sense.level)).toEqual(["A", "C"]);
    expect(mappings).toHaveLength(3);
  });

  it("requires a graded match when choosing specific levels", () => {
    expect(filterMappingsByLevel([mapping(4, "old", [null])], ["B"])).toEqual([]);
  });

  it("uses the same eligible mappings for subtitle highlights and cue learning", () => {
    const filtered = filterMappingsByLevel(mappings, ["B"]);
    const annotated = annotateCuesWithMappings(cues, filtered);
    expect(annotated[0].tokens.filter((token) => token.mappingId != null).map((token) => token.word)).toEqual(["page"]);
    expect(getCueLearningItems(cues[0], filtered).map((item) => item.mappingId)).toEqual([3]);
  });
});
