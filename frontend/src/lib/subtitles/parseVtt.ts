import { tokenizeCueText } from "@/lib/subtitles/tokenize"
import { parseVttTimestamp } from "@/lib/subtitles/time"
import type {
  ParsedSubtitle,
  SubtitleCue,
} from "@/types/subtitles"

type RawCue = {
  cueId: number
  sourceIdentifier: string | null
  startTime: number
  endTime: number
  text: string
}

const TIMING_SEPARATOR = "-->"

export function parseVtt(input: string): ParsedSubtitle {
  const normalized = input
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n?/gu, "\n")

  const lines = normalized.split("\n")
  let cursor = 0

  if (lines[0]?.trim().startsWith("WEBVTT")) {
    cursor = 1

    // Skip optional WebVTT header metadata until the first blank line.
    while (cursor < lines.length && lines[cursor]?.trim() !== "") {
      cursor += 1
    }
  }

  const rawCues: RawCue[] = []

  while (cursor < lines.length) {
    while (cursor < lines.length && lines[cursor]?.trim() === "") {
      cursor += 1
    }

    if (cursor >= lines.length) {
      break
    }

    const line = lines[cursor]?.trim() ?? ""

    if (
      line === "STYLE" ||
      line === "REGION" ||
      line === "NOTE" ||
      line.startsWith("NOTE ")
    ) {
      cursor = skipBlock(lines, cursor + 1)
      continue
    }

    let sourceIdentifier: string | null = null
    let timingLine = line

    if (!timingLine.includes(TIMING_SEPARATOR)) {
      sourceIdentifier = timingLine
      cursor += 1
      timingLine = lines[cursor]?.trim() ?? ""
    }

    if (!timingLine.includes(TIMING_SEPARATOR)) {
      cursor = skipBlock(lines, cursor + 1)
      continue
    }

    const { startTime, endTime } = parseTimingLine(timingLine)

    cursor += 1
    const textLines: string[] = []

    while (cursor < lines.length && lines[cursor]?.trim() !== "") {
      textLines.push(lines[cursor] ?? "")
      cursor += 1
    }

    const cueOrder = rawCues.length + 1
    const cueId = getCanonicalCueId(sourceIdentifier, cueOrder)

    rawCues.push({
      cueId,
      sourceIdentifier,
      startTime,
      endTime,
      text: textLines.join("\n").trim(),
    })
  }

  ensureUniqueCueIds(rawCues)

  return {
    cues: rawCues.map((cue, index) =>
      createCanonicalCue(cue, index, rawCues),
    ),
  }
}

function parseTimingLine(line: string) {
  const separatorIndex = line.indexOf(TIMING_SEPARATOR)

  if (separatorIndex < 0) {
    throw new Error(`Invalid WebVTT timing line: ${line}`)
  }

  const start = line.slice(0, separatorIndex).trim()
  const rightSide = line.slice(separatorIndex + TIMING_SEPARATOR.length).trim()
  const end = rightSide.split(/\s+/u)[0]

  if (!start || !end) {
    throw new Error(`Invalid WebVTT timing line: ${line}`)
  }

  const startTime = parseVttTimestamp(start)
  const endTime = parseVttTimestamp(end)

  if (endTime < startTime) {
    throw new Error(`WebVTT cue ends before it starts: ${line}`)
  }

  return { startTime, endTime }
}

function getCanonicalCueId(
  sourceIdentifier: string | null,
  fallbackOrder: number,
) {
  if (!sourceIdentifier) {
    return fallbackOrder
  }

  const parsed = Number(sourceIdentifier)

  if (
    Number.isSafeInteger(parsed) &&
    parsed > 0 &&
    String(parsed) === sourceIdentifier.trim()
  ) {
    return parsed
  }

  return fallbackOrder
}

function createCanonicalCue(
  cue: RawCue,
  index: number,
  allCues: RawCue[],
): SubtitleCue {
  const previous = allCues[index - 1]
  const next = allCues[index + 1]

  return {
    ...cue,
    tokens: tokenizeCueText(cue.text, cue.cueId),
    previousCueStartTime: previous?.startTime ?? null,
    previousCueEndTime: previous?.endTime ?? null,
    nextCueStartTime: next?.startTime ?? null,
    nextCueEndTime: next?.endTime ?? null,
  }
}

function ensureUniqueCueIds(cues: RawCue[]) {
  const seen = new Set<number>()

  for (const cue of cues) {
    if (seen.has(cue.cueId)) {
      throw new Error(
        `Duplicate canonical WebVTT cue id ${cue.cueId}. ` +
          "Use unique numeric cue identifiers, or remove identifiers so " +
          "1-based cue order can be used.",
      )
    }

    seen.add(cue.cueId)
  }
}

function skipBlock(lines: string[], cursor: number) {
  while (cursor < lines.length && lines[cursor]?.trim() !== "") {
    cursor += 1
  }

  return cursor
}
