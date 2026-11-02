import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { VocabularyFilter } from "@/components/vocabulary/VocabularyFilter"
import { VocabularyListManager } from "@/components/vocabulary/VocabularyListManager"
import { parsePositivePage, buildUrl } from "@/lib/courses/query"
import { getVocabulary } from "@/lib/vocabulary/server"

export const metadata: Metadata = { title: "My vocabulary" }

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string }> }) {
  const params = await searchParams
  const page = parsePositivePage(params.page)
  const filter = params.filter === "review" ? "review" : params.filter === "stable" ? "stable" : "all"
  const needs = filter === "review" ? true : filter === "stable" ? false : undefined
  const data = await getVocabulary(page, buildUrl("/my-vocabulary", { page, filter: filter === "all" ? undefined : filter }), needs)

  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageHeader title="My vocabulary" description="Every item is a learned dictionary sense. Manage review status or remove senses from your learned vocabulary." />
        </div>
        <div className="shrink-0 sm:mt-1">
          <VocabularyFilter value={filter} />
        </div>
      </div>
      <div className="mt-6 max-w-3xl">
        <VocabularyListManager
          key={`${filter}-${page}`}
          rows={data.results}
          actions={[
            { action: "set_needs_review", label: "Add to review" },
            { action: "unset_needs_review", label: "Remove from review" },
            { action: "unset_learned", label: "Remove learned status", variant: "destructive" },
          ]}
        />
      </div>
      <Pagination page={page} count={data.count} makeHref={(next) => buildUrl("/my-vocabulary", { page: next, filter: filter === "all" ? undefined : filter })} />
    </div>
  )
}
