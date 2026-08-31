import "server-only"
import { djangoServerFetch } from "@/lib/api/server"
import type { PaginatedResponse } from "@/types/api/common"
import type { Vocabulary } from "@/types/api/vocabulary"

export function getVocabulary(page: number, returnTo: string, needsReview?: boolean) { const q = new URLSearchParams({ page: String(page) }); if (needsReview !== undefined) q.set("needs_review", String(needsReview)); return djangoServerFetch<PaginatedResponse<Vocabulary>>(`/api/my-vocabulary/vocabulary/?${q}`, { returnTo }) }
