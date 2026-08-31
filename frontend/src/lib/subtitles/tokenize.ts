import { createSubtitleTokenKey } from "@/lib/subtitles/identity"
import type { SubtitleToken } from "@/types/subtitles"

/**
 * V1 tokenization contract:
 * - split only on whitespace
 * - punctuation remains attached
 * - contractions/apostrophes remain inside the token
 * - positionInCue counts occurrences of the exact token string in that cue
 */
export function tokenizeCueText(
  text: string,
  cueId: number,
): SubtitleToken[] {
  const words = text.trim().split(/\s+/u).filter(Boolean)
  const occurrences = new Map<string, number>()

  return words.map((word, index) => {
    const positionInCue = (occurrences.get(word) ?? 0) + 1
    occurrences.set(word, positionInCue)

    return {
      index,
      cueId,
      word,
      positionInCue,
      key: createSubtitleTokenKey({
        cueId,
        word,
        positionInCue,
      }),
    }
  })
}
