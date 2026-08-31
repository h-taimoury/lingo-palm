import type { WordSenseMapping } from "@/types/api/courses"
import type { SenseSummary } from "@/types/api/dictionary"
import type { SubtitleCue } from "@/types/subtitles"

export type LearningItem = {
  mappingId: number
  mappingLabel: string
  sense: SenseSummary
}

function mappingLabelForCue(
  mapping: WordSenseMapping,
  cue: SubtitleCue | undefined,
) {
  if (cue) {
    const matched = cue.tokens.filter((token) =>
      mapping.subtitle_words.some(
        (word) =>
          word.cue_id === cue.cueId &&
          word.word === token.word &&
          word.position_in_cue === token.positionInCue,
      ),
    )

    if (matched.length) return matched.map((token) => token.word).join(" ")
  }

  return mapping.senses[0]?.entry.word ?? "Vocabulary"
}

export function getMappingLearningItems(
  mapping: WordSenseMapping | undefined,
  cue?: SubtitleCue,
): LearningItem[] {
  if (!mapping) return []

  const mappingLabel = mappingLabelForCue(mapping, cue)
  return mapping.senses.map((sense) => ({
    mappingId: mapping.id,
    mappingLabel,
    sense,
  }))
}

export function getCueLearningItems(
  cue: SubtitleCue | undefined,
  mappings: WordSenseMapping[],
): LearningItem[] {
  if (!cue) return []

  const ordered = mappings
    .map((mapping) => {
      const indexes = mapping.subtitle_words
        .filter((word) => word.cue_id === cue.cueId)
        .map((word) =>
          cue.tokens.findIndex(
            (token) =>
              token.word === word.word &&
              token.positionInCue === word.position_in_cue,
          ),
        )
        .filter((index) => index >= 0)

      return {
        mapping,
        first: indexes.length ? Math.min(...indexes) : Number.POSITIVE_INFINITY,
      }
    })
    .filter((item) => Number.isFinite(item.first))
    .sort(
      (left, right) =>
        left.first - right.first || left.mapping.id - right.mapping.id,
    )

  return ordered.flatMap(({ mapping }) =>
    getMappingLearningItems(mapping, cue),
  )
}

export function cueHasMappings(
  cue: SubtitleCue | undefined,
  mappings: WordSenseMapping[],
) {
  return Boolean(
    cue &&
      mappings.some((mapping) =>
        mapping.subtitle_words.some((word) => word.cue_id === cue.cueId),
      ),
  )
}
