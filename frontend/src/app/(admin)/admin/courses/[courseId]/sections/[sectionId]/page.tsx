import { notFound } from "next/navigation"
import Link from "next/link"
import { DeleteButton } from "@/components/admin/DeleteButton"
import { MappingEditor } from "@/components/admin/mappings/MappingEditor"
import { SectionEditor } from "@/components/admin/sections/SectionEditor"
import { SubtitleUpload } from "@/components/admin/sections/SubtitleUpload"
import { PageHeader } from "@/components/shared/PageHeader"
import { getAdminSection } from "@/lib/admin/server"
import { proxyDjangoMediaUrl } from "@/lib/media.server"

export default async function Page({ params }: { params: Promise<{ courseId: string; sectionId: string }> }) { const { courseId, sectionId } = await params; const returnTo = `/admin/courses/${courseId}/sections/${sectionId}`; const section = await getAdminSection(sectionId, returnTo); if (section.course.id !== Number(courseId)) notFound(); const subtitle = proxyDjangoMediaUrl(section.subtitle_file) ?? section.subtitle_file; return <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8"><Link href={`/admin/courses/${courseId}`} className="text-sm text-muted-foreground hover:text-foreground">← {section.course.title}</Link><div className="mt-4"><PageHeader title={section.title} description={`Section #${section.id}`} actions={<DeleteButton endpoint={`/api/courses/sections/${section.id}/`} confirmation={`Delete “${section.title}” and all its mappings?`} redirectTo={`/admin/courses/${courseId}`} />} /></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><SectionEditor section={section} /><SubtitleUpload sectionId={section.id} current={subtitle} mappingCount={section.word_sense_mappings.length} /></div><section className="mt-10"><h2 className="text-xl font-semibold">Subtitle mapping workspace</h2><p className="mt-1 text-sm text-muted-foreground">Select words either while watching the video or from the full transcript. Both views share one selection and mapping workflow.</p><div className="mt-5"><MappingEditor section={{ ...section, subtitle_file: subtitle }} /></div></section></div> }
