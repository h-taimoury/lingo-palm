import "server-only";

import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { djangoServerFetch } from "@/lib/api/server";
import type { PaginatedResponse } from "@/types/api/common";
import type {
  CourseDetail,
  CourseSummary,
  SectionDetail,
  TaughtSense,
} from "@/types/api/courses";

async function notFoundAware<T>(promise: Promise<T>) {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export function getLearnerCourses(page: number, returnTo: string, search = "") {
  const query = new URLSearchParams({ page: String(page) });
  if (search) query.set("search", search);
  return djangoServerFetch<PaginatedResponse<CourseSummary>>(
    `/api/courses/courses/?${query}`,
    { returnTo },
  );
}
export function getLearnerCourse(courseId: string | number, returnTo: string) {
  return notFoundAware(
    djangoServerFetch<CourseDetail>(`/api/courses/courses/${courseId}/`, {
      returnTo,
    }),
  );
}
export async function getLearnerSection(
  courseId: string | number,
  sectionId: string | number,
  returnTo: string,
) {
  const section = await notFoundAware(
    djangoServerFetch<SectionDetail>(`/api/courses/sections/${sectionId}/`, {
      returnTo,
    }),
  );
  if (section.course.id !== Number(courseId)) notFound();
  return section;
}
export function getSectionTaughtSenses(
  sectionId: string | number,
  returnTo: string,
) {
  return notFoundAware(
    djangoServerFetch<TaughtSense[]>(
      `/api/courses/sections/${sectionId}/taught-senses/`,
      { returnTo },
    ),
  );
}
