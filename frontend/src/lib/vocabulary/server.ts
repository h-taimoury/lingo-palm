import "server-only"
import { djangoServerFetch } from "@/lib/api/server"
import type { PaginatedResponse } from "@/types/api/common"
import type { Vocabulary } from "@/types/api/vocabulary"

export async function getAllVocabulary(returnTo: string) {
  const rows = new Map<number, Vocabulary>()
  for (let page = 1; ; page += 1) {
    const data = await djangoServerFetch<PaginatedResponse<Vocabulary>>(
      `/api/my-vocabulary/vocabulary/?page=${page}&page_size=100`,
      { returnTo },
    )
    for (const row of data.results) rows.set(row.sense.id, row)
    if (!data.next) return [...rows.values()]
  }
}
