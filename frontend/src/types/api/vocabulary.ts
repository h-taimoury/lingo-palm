import type { SenseSummary } from "@/types/api/dictionary"
import type { SectionDetail } from "@/types/api/courses"

export type Vocabulary = {
  id: number
  sense: SenseSummary & { lex_unit: string | null }
  already_known: boolean
  needs_review: boolean
  created_at: string
  learned_at: string | null
  review_due_at: string
  reviewed_at: string | null
  review_version: number
}

export type ReviewBatch = {
  results: Vocabulary[]
  due_count: number
  next_due_at: string | null
}

export type LearningDay = { date: string; count: number }

export type LearningProgress = {
  days: 7 | 30 | 90
  timezone: string
  start_date: string
  end_date: string
  total_learned: number
  period_learned: number
  learning_days: number
  daily_counts: LearningDay[]
  recently_learned: Vocabulary[]
  review_due_count: number
}

export type ReviewRating = 1 | 3

export type ReviewAnswerRequest = {
  submission_id: string
  rating: ReviewRating
  version: number
}

export type ReviewAnswerResponse = {
  submission_id: string
  rating: ReviewRating
  reviewed_at: string
  due_at: string
  version: number
}

export type ReviewClip = {
  section: Pick<SectionDetail, "id" | "title" | "local_video_url" | "hosted_video_url" | "playback_url" | "subtitle_file">
  cue_id: number
  start: number
  end: number
}

export type ReviewClipsResponse =
  | { available: false }
  | { available: true; clips: ReviewClip[] }

export type VocabularyBulkAction =
  | "set_already_known"
  | "unset_already_known"
  | "set_learned"
  | "unset_learned"
  | "set_needs_review"
  | "unset_needs_review"

export type VocabularyBulkActionRequest = {
  action: VocabularyBulkAction
  sense_ids: number[]
}

export type VocabularyBulkActionRowsResponse = Vocabulary[]
export type VocabularyUnsetLearnedResponse = { detail: string; sense_ids: number[] }
export type VocabularyBulkActionResponse = VocabularyBulkActionRowsResponse | VocabularyUnsetLearnedResponse
