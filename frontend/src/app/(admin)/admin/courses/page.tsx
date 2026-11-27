import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { getAdminCourses } from "@/lib/admin/server";
import { parsePositivePage, buildUrl } from "@/lib/courses/query";
import { cn } from "@/lib/utils";
import { CourseSearchForm } from "@/components/admin/courses/CourseSearchForm";
import { getTranslations } from "@/lib/i18n/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const t = await getTranslations();

  const params = await searchParams;
  const page = parsePositivePage(params.page);
  const search = (params.search ?? "").trim();
  const returnTo = buildUrl("/admin/courses", { page, search });
  const data = await getAdminCourses(page, search, returnTo);
  return (
    <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
      <PageHeader
        title={t("Courses")}
        description={t("Staff can see drafts as well as published courses.")}
        actions={
          <Link href="/admin/courses/create" className={cn(buttonVariants())}>
            {t("Create course")}</Link>
        }
      />
      <CourseSearchForm search={search} />
      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        {data.results.length ? (
          data.results.map((course) => (
            <div
              key={course.id}
              className="flex flex-wrap items-center gap-4 border-b p-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="font-medium hover:underline"
                >
                  {course.title}
                </Link>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline">{course.level}</Badge>
                  <Badge
                    variant={course.is_published ? "secondary" : "outline"}
                  >
                    {course.is_published ? t("Published") : t("Draft")}
                  </Badge>
                </div>
              </div>
              <DeleteButton
                endpoint={`/api/courses/courses/${course.id}/`}
                confirmation={t("Delete “{0}” and every section/mapping inside it?", { 0: course.title })}
              />
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t("No courses found.")}</p>
        )}
      </div>
      <Pagination
        page={page}
        count={data.count}
        makeHref={(next) => buildUrl("/admin/courses", { page: next, search })}
      />
    </div>
  );
}
