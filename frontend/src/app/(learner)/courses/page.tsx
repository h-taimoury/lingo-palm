import type { Metadata } from "next"
import { Input } from "@/components/ui/input"
import { CourseCard } from "@/components/courses/CourseCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { getLearnerCourses } from "@/lib/courses/learner"
import { parsePositivePage, withPage } from "@/lib/courses/query"
import { proxyDjangoMediaUrl } from "@/lib/media.server"

export const metadata: Metadata = { title: "Courses" }
export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const params = await searchParams; const page = parsePositivePage(params.page); const search = (params.search ?? "").trim(); const returnTo = withPage("/courses", page, { search }); const data = await getLearnerCourses(page, returnTo, search)
  return <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8"><PageHeader title="Courses" description="Choose a course and learn through its published video sections." /><form className="mt-7 max-w-xl" action="/courses"><Input name="search" defaultValue={search} placeholder="Search courses, descriptions, or levels…" /></form><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.results.map((course) => <CourseCard key={course.id} course={course} thumbnail={proxyDjangoMediaUrl(course.thumbnail)} />)}</div>{!data.results.length ? <p className="mt-8 rounded-xl border border-dashed p-8 text-center text-muted-foreground">No courses match your search.</p> : null}<Pagination page={page} count={data.count} makeHref={(next) => withPage("/courses", next, { search })} /></div>
}
