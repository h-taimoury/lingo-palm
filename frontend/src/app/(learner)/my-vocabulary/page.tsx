import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { VocabularyFilter } from "@/components/vocabulary/VocabularyFilter"
import { VocabularyListManager } from "@/components/vocabulary/VocabularyListManager"
import { parsePositivePage, buildUrl } from "@/lib/courses/query"
import { getVocabulary } from "@/lib/vocabulary/server"

export const metadata: Metadata = { title: "My vocabulary" }

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string; source?: string }> }) {
  const params = await searchParams
  const page = parsePositivePage(params.page)
  const filter = params.filter === "review" ? "review" : params.filter === "stable" ? "stable" : "all"
  const source = params.source === "known" ? "known" : params.source === "here" ? "here" : "all"
  const alreadyKnown = source === "known" ? true : source === "here" ? false : undefined
  const filterParams = { filter: filter === "all" ? undefined : filter, source: source === "all" ? undefined : source }
  const needs = filter === "review" ? true : filter === "stable" ? false : undefined
  const data = await getVocabulary(page, buildUrl("/my-vocabulary", { page, ...filterParams }), needs, alreadyKnown)

  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <PageHeader title="My vocabulary" description="Every item is a learned dictionary sense. Manage review status or remove senses from your learned vocabulary." />
      <div className="mt-6">
        <VocabularyFilter value={filter} source={source} />
      </div>
      <div className="mt-6 max-w-3xl">
        <VocabularyListManager
          key={`${filter}-${source}-${page}`}
          rows={data.results}
          actions={[
            { action: "set_needs_review", label: "Add to review" },
            { action: "unset_needs_review", label: "Remove from review" },
            { action: "set_already_known", label: "Mark as already knew" },
            { action: "unset_already_known", label: "Clear already knew" },
            { action: "unset_learned", label: "Unlearn", variant: "destructive" },
          ]}
        />
      </div>
      <Pagination page={page} count={data.count} makeHref={(next) => buildUrl("/my-vocabulary", { page: next, ...filterParams })} />
    </div>
  )
}
