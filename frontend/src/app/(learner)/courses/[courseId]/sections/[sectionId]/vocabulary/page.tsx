import type { Metadata } from "next"
import Link from "next/link"
import { SectionVocabularyManager } from "@/components/vocabulary/SectionVocabularyManager"
import { PageHeader } from "@/components/shared/PageHeader"
import { getLearnerSection, getSectionTaughtSenses } from "@/lib/courses/learner"

export const metadata: Metadata = { title: "Section vocabulary" }
export default async function Page({ params }: { params: Promise<{ courseId: string; sectionId: string }> }) { const { courseId, sectionId } = await params; const returnTo = `/courses/${courseId}/sections/${sectionId}/vocabulary`; const [section, taught] = await Promise.all([getLearnerSection(courseId, sectionId, returnTo), getSectionTaughtSenses(sectionId, returnTo)]); return <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6"><Link href={`/courses/${courseId}/sections/${sectionId}`} className="text-sm text-muted-foreground hover:text-foreground">← Back to lesson</Link><div className="mt-5"><PageHeader eyebrow={section.course.title} title={`Vocabulary in ${section.title}`} description="Each row is an exact dictionary sense taught by this section." /></div><div className="mt-8"><SectionVocabularyManager taughtSenses={taught} /></div></div> }
