"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import type { CourseDetail, CourseWriteRequest } from "@/types/api/courses"

export function CourseEditor({ course }: { course: CourseDetail }) { const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const body: CourseWriteRequest = { title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), level: String(form.get("level")) as CourseWriteRequest["level"], is_published: form.get("is_published") === "on" }; setBusy(true); setError(null); try { await apiClient.patch(`/api/courses/courses/${course.id}/`, body); router.refresh() } catch (caught) { setError(caught) } finally { setBusy(false) } } return <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Course details</h2><ApiErrorMessage error={error} /><div className="space-y-2"><Label htmlFor="edit_course_title">Title</Label><Input id="edit_course_title" name="title" defaultValue={course.title} required /></div><div className="space-y-2"><Label htmlFor="edit_course_desc">Description</Label><Textarea id="edit_course_desc" name="description" defaultValue={course.description} rows={5} /></div><div className="space-y-2"><Label htmlFor="edit_course_level">Level</Label><select id="edit_course_level" name="level" defaultValue={course.level} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={course.is_published} className="size-4" /> Published</label><Button disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Saving…" : "Save course"}</Button></form> }
