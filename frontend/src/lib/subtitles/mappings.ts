import { createSubtitleTokenKey } from "@/lib/subtitles/identity"
import type {
  SubtitleWordInput,
  WordSenseMapping,
} from "@/types/api/courses"
import type {
  MappedSubtitleCue,
  SubtitleCue,
  SubtitleMappingIndex,
  SubtitleToken,
} from "@/types/subtitles"

export function buildSubtitleMappingIndex(
  mappings: WordSenseMapping[],
): SubtitleMappingIndex {
  const index: SubtitleMappingIndex = new Map()

  for (const mapping of mappings) {
    for (const subtitleWord of mapping.subtitle_words) {
      const key = createSubtitleTokenKey({
        cueId: subtitleWord.cue_id,
        word: subtitleWord.word,
        positionInCue: subtitleWord.position_in_cue,
      })

      const existing = index.get(key)

      if (existing && existing.id !== mapping.id) {
        throw new Error(
          `Subtitle occurrence ${key} belongs to more than one mapping.`,
        )
      }

      index.set(key, mapping)
    }
  }

  return index
}

export function annotateCuesWithMappings(
  cues: SubtitleCue[],
  mappings: WordSenseMapping[],
): MappedSubtitleCue[] {
  const mappingIndex = buildSubtitleMappingIndex(mappings)

  return cues.map((cue) => ({
    ...cue,
    tokens: cue.tokens.map((token) => ({
      ...token,
      mappingId: mappingIndex.get(token.key)?.id ?? null,
    })),
  }))
}

export function getMappingForToken(
  token: SubtitleToken,
  mappingIndex: SubtitleMappingIndex,
): WordSenseMapping | null {
  return mappingIndex.get(token.key) ?? null
}

export function tokenToSubtitleWordInput(
  token: SubtitleToken,
  cue: SubtitleCue,
): SubtitleWordInput {
  if (token.cueId !== cue.cueId) {
    throw new Error(
      `Token cue ${token.cueId} does not match cue ${cue.cueId}.`,
    )
  }

  return {
    word: token.word,
    cue_id: cue.cueId,
    cue_start_time: cue.startTime,
    cue_end_time: cue.endTime,
    previous_cue_start_time: cue.previousCueStartTime,
    previous_cue_end_time: cue.previousCueEndTime,
    next_cue_start_time: cue.nextCueStartTime,
    next_cue_end_time: cue.nextCueEndTime,
    position_in_cue: token.positionInCue,
  }
}
