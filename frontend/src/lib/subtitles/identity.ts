import type {
  SubtitleTokenIdentity,
} from "@/types/subtitles"

const KEY_SEPARATOR = "\u001f"

export function createSubtitleTokenKey(
  identity: SubtitleTokenIdentity,
): string {
  return [
    String(identity.cueId),
    identity.word,
    String(identity.positionInCue),
  ].join(KEY_SEPARATOR)
}
