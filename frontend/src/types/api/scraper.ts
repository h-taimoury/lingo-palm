import type { Entry } from "@/types/api/dictionary"

export type ScrapeRequest = { word: string }
export type ScrapeResponse = {
  detail: string
  entry_ids: number[]
  entries: Entry[]
}
export type RejectScrapeRequest = { entry_ids: number[] }
export type RejectScrapeResponse = { detail: string; deleted_entry_ids: number[] }
