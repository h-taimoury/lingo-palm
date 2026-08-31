import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "@/components/shared/PageHeader"
export const metadata: Metadata = { title: "Clip review" }
export default function Page() { return <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6"><PageHeader title="Clip review" description="The current Django API does not expose a sense-to-section lookup, so LingoPalm cannot reliably locate the source video clip for an arbitrary review sense yet." /><div className="mt-8 rounded-xl border border-dashed p-8"><p className="font-medium">Waiting on one backend capability</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Once Django can resolve a learned sense back to relevant section/cue occurrences, this page can reuse the same player and subtitle identity system already used by lessons.</p><Link href="/review/flashcard" className="mt-5 inline-block text-sm font-medium underline underline-offset-4">Use flashcards instead</Link></div></div> }
