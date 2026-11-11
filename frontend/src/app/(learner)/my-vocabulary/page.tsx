import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/PageHeader"
import { SectionVocabularyManager } from "@/components/vocabulary/SectionVocabularyManager"
import { getAllVocabulary } from "@/lib/vocabulary/server"

export const metadata: Metadata = { title: "My vocabulary" }

export default async function Page() {
  const rows = await getAllVocabulary("/my-vocabulary")

  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <SectionVocabularyManager
        allLearned
        taughtSenses={rows.map((row) => ({
          sense: row.sense,
          is_learned: true,
          already_known: row.already_known,
          needs_review: row.needs_review,
        }))}
        header={<PageHeader title="My vocabulary" description="Manage all your learned dictionary senses." />}
      />
    </div>
  )
}
