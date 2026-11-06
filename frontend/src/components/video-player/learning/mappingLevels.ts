import type { WordSenseMapping } from "@/types/api/courses";
import type { SenseLevel } from "@/types/api/dictionary";

export const SENSE_LEVELS: readonly SenseLevel[] = ["A", "B", "C"];

export function filterMappingsByLevel(
  mappings: WordSenseMapping[],
  selectedLevels: readonly SenseLevel[],
): WordSenseMapping[] {
  // The default shows everything, including senses that have not been graded.
  if (SENSE_LEVELS.every((level) => selectedLevels.includes(level))) return mappings;
  return mappings.filter((mapping) =>
    mapping.senses.some((sense) =>
      sense.level ? selectedLevels.includes(sense.level) : false,
    ),
  );
}
