import type { Metadata } from "next";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseSearchForm } from "@/components/courses/CourseSearchForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { getLearnerCourses } from "@/lib/courses/learner";
import {
  firstSearchParam,
  parsePositivePage,
  buildUrl,
} from "@/lib/courses/query";
import { proxyDjangoMediaUrl } from "@/lib/media.server";

export const metadata: Metadata = { title: "Courses" };
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    search?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const page = parsePositivePage(params.page);
  const search = (firstSearchParam(params.search) ?? "").trim();
  const data = await getLearnerCourses(page, search);
  return (
    <div className="mx-auto max-w-7xl px-4 py-9 pb-20 sm:px-6 lg:px-8">
      <PageHeader
        title="Courses"
        description="Choose a course and learn through its published video sections."
      />
      <CourseSearchForm search={search} />
      <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.results.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            thumbnail={proxyDjangoMediaUrl(course.thumbnail)}
          />
        ))}
      </div>
      {!data.results.length ? (
        <p className="mt-8 rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No courses match your search.
        </p>
      ) : null}
      <Pagination
        page={page}
        count={data.count}
        makeHref={(next) => buildUrl("/courses", { page: next, search })}
      />
    </div>
  );
}
