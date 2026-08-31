import "server-only"

import { notFound } from "next/navigation"
import { ApiError } from "@/lib/api/errors"
import { djangoServerFetch } from "@/lib/api/server"
import type { PaginatedResponse } from "@/types/api/common"
import type { CourseDetail, CourseSummary, SectionDetail } from "@/types/api/courses"
import type { Entry, Sense } from "@/types/api/dictionary"
import type { AdminUser } from "@/types/api/users"

async function maybe404<T>(promise: Promise<T>) { try { return await promise } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error } }
export function getAdminCourses(page: number, search: string, returnTo: string) { const q = new URLSearchParams({ page: String(page) }); if (search) q.set("search", search); return djangoServerFetch<PaginatedResponse<CourseSummary>>(`/api/courses/courses/?${q}`, { returnTo }) }
export function getAdminCourse(id: string, returnTo: string) { return maybe404(djangoServerFetch<CourseDetail>(`/api/courses/courses/${id}/`, { returnTo })) }
export function getAdminSection(id: string, returnTo: string) { return maybe404(djangoServerFetch<SectionDetail>(`/api/courses/sections/${id}/`, { returnTo })) }
export function getDictionaryEntries(page: number, search: string, returnTo: string) { const q = new URLSearchParams({ page: String(page) }); if (search) q.set("search", search); return djangoServerFetch<PaginatedResponse<Entry>>(`/api/dictionary/entries/?${q}`, { returnTo }) }
export function getDictionarySenses(page: number, search: string, returnTo: string) { const q = new URLSearchParams({ page: String(page) }); if (search) q.set("search", search); return djangoServerFetch<PaginatedResponse<Sense>>(`/api/dictionary/senses/?${q}`, { returnTo }) }
export function getAdminUsers(page: number, returnTo: string) { return djangoServerFetch<PaginatedResponse<AdminUser>>(`/api/users/?page=${page}`, { returnTo }) }
