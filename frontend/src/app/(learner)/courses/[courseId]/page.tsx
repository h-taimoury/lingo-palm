import type { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { SectionList } from "@/components/courses/SectionList"
import { getLearnerCourse } from "@/lib/courses/learner"
import { proxyDjangoMediaUrl } from "@/lib/media.server"

type Props = { params: Promise<{ courseId: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { courseId } = await params; const course = await getLearnerCourse(courseId, `/courses/${courseId}`); return { title: course.title } }
export default async function CoursePage({ params }: Props) { const { courseId } = await params; const course = await getLearnerCourse(courseId, `/courses/${courseId}`); const thumbnail = proxyDjangoMediaUrl(course.thumbnail); return <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8"><Link href="/courses" className="text-sm text-muted-foreground hover:text-foreground">← All courses</Link><div className="mt-6 grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div>{thumbnail ? <img src={thumbnail} alt="" className="aspect-video w-full rounded-2xl border object-cover" /> : <div className="grid aspect-video place-items-center rounded-2xl border bg-muted text-muted-foreground">No thumbnail</div>}</div><div><Badge variant="secondary">{course.level}</Badge><h1 className="mt-3 text-4xl font-semibold tracking-tight">{course.title}</h1><p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">{course.description || "No description yet."}</p></div></div><section className="mt-10"><h2 className="text-xl font-semibold">Sections</h2><div className="mt-4"><SectionList courseId={course.id} sections={course.sections} /></div></section></div> }
