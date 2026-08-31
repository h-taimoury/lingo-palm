import type { SenseSummary } from "@/types/api/dictionary"

export type Vocabulary = {
  id: number
  sense: SenseSummary
  already_known: boolean
  needs_review: boolean
  created_at: string
}

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
