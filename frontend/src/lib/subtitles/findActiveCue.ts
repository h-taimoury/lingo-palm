import type { SubtitleCue } from "@/types/subtitles"

/**
 * Binary-search fallback for seeks/discontinuous playback jumps.
 *
 * The canonical LingoPalm playback model has one active subtitle cue at a
 * time. The result uses an end-exclusive range: startTime <= t < endTime.
 */
export function findActiveCueIndex(
  cues: SubtitleCue[],
  currentTime: number,
): number {
  let low = 0
  let high = cues.length - 1
  let candidate = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const cue = cues[mid]

    if (!cue) {
      return -1
    }

    if (cue.startTime <= currentTime) {
      candidate = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (candidate < 0) {
    return -1
  }

  const cue = cues[candidate]

  return cue && currentTime < cue.endTime ? candidate : -1
}
