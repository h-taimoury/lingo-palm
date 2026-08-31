import type { Metadata } from "next"
import Link from "next/link"
import { FlashcardDeck } from "@/components/review/FlashcardDeck"
import { PageHeader } from "@/components/shared/PageHeader"
import { djangoServerFetch } from "@/lib/api/server"
import type { PaginatedResponse } from "@/types/api/common"
import type { Vocabulary } from "@/types/api/vocabulary"

export const metadata: Metadata = { title: "Flashcard review" }
export default async function Page() { const data = await djangoServerFetch<PaginatedResponse<Vocabulary>>("/api/my-vocabulary/vocabulary/?needs_review=true&page=1", { returnTo: "/review/flashcard" }); return <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6"><PageHeader title="Flashcard review" description="Work through the first page of senses currently marked for review. Marking a card reviewed removes it from the review queue without unlearning it." actions={<Link href="/review/clip" className="text-sm font-medium underline underline-offset-4">Clip review</Link>} /><div className="mt-8"><FlashcardDeck initialRows={data.results} /></div>{data.next ? <p className="mt-4 text-center text-xs text-muted-foreground">More review senses remain after this batch.</p> : null}</div> }
