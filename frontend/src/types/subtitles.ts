import type { WordSenseMapping } from "@/types/api/courses"

export type SubtitleTokenIdentity = {
  cueId: number
  word: string
  positionInCue: number
}

export type SubtitleToken = SubtitleTokenIdentity & {
  index: number
  key: string
}

export type SubtitleCue = {
  cueId: number
  sourceIdentifier: string | null
  startTime: number
  endTime: number
  text: string
  tokens: SubtitleToken[]
  previousCueStartTime: number | null
  previousCueEndTime: number | null
  nextCueStartTime: number | null
  nextCueEndTime: number | null
}

export type ParsedSubtitle = {
  cues: SubtitleCue[]
}

export type MappedSubtitleToken = SubtitleToken & {
  mappingId: number | null
}

export type MappedSubtitleCue = Omit<SubtitleCue, "tokens"> & {
  tokens: MappedSubtitleToken[]
}

export type SubtitleMappingIndex = Map<string, WordSenseMapping>
