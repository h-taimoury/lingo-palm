import type { Sense, SenseSummary } from "@/types/api/dictionary"

export type CourseLevel = "Beginner" | "Intermediate" | "Advanced"

export type CourseSummary = {
  id: number
  title: string
  description: string
  thumbnail: string | null
  level: CourseLevel
  is_published: boolean
  created_at: string
}

export type SectionSummary = {
  id: number
  title: string
  order: number
  is_published: boolean
  new_words_count: number | null
  learned_percentage: number | null
}

export type CourseDetail = CourseSummary & { sections: SectionSummary[] }

export type CourseWriteRequest = {
  title: string
  description: string
  level: CourseLevel
  is_published: boolean
}

export type SectionFlat = {
  id: number
  course: number
  title: string
  order: number
  video_url: string
  subtitle_file: string
  is_published: boolean
  created_at: string
}

export type SubtitleWord = {
  id: number
  mapping: number
  word: string
  cue_id: number
  cue_start_time: number
  cue_end_time: number
  previous_cue_start_time: number | null
  previous_cue_end_time: number | null
  next_cue_start_time: number | null
  next_cue_end_time: number | null
  position_in_cue: number
}

export type SubtitleWordInput = Omit<SubtitleWord, "id" | "mapping">

export type WordSenseMapping = {
  id: number
  senses: Sense[]
  subtitle_words: SubtitleWord[]
  created_at: string
}

export type SectionDetail = {
  id: number
  course: CourseSummary
  title: string
  order: number
  video_url: string
  subtitle_file: string
  is_published: boolean
  word_sense_mappings: WordSenseMapping[]
  new_words_count: number | null
  learned_percentage: number | null
}

export type SectionWriteRequest = {
  course: number
  title: string
  order: number
  video_url: string
  is_published: boolean
}

export type CreateWordSenseMappingRequest = {
  section: number
  senses: number[]
  subtitle_words: SubtitleWordInput[]
}

export type UpdateWordSenseMappingRequest = { sense_ids: number[] }

export type CreateSubtitleWordRequest = SubtitleWordInput & { mapping: number }
export type UpdateSubtitleWordRequest = Partial<CreateSubtitleWordRequest>

export type TaughtSense = {
  sense: SenseSummary
  is_learned: boolean
  already_known: boolean | null
  needs_review: boolean | null
}
