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
import type { CourseDetail } from "@/types/api/courses"

export function CourseCreateForm() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null)
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("is_published", form.get("is_published") === "on" ? "true" : "false"); const thumbnail = form.get("thumbnail"); if (!(thumbnail instanceof File) || !thumbnail.size) form.delete("thumbnail"); setBusy(true); setError(null); try { const course = await apiClient.post<CourseDetail, FormData>("/api/courses/courses/", form); router.push(`/admin/courses/${course.id}`); router.refresh() } catch (caught) { setError(caught) } finally { setBusy(false) } }
  return <form onSubmit={submit} className="space-y-5"><ApiErrorMessage error={error} /><div className="space-y-2"><Label htmlFor="course_title">Title</Label><Input id="course_title" name="title" required /></div><div className="space-y-2"><Label htmlFor="course_description">Description</Label><Textarea id="course_description" name="description" rows={5} /></div><div className="space-y-2"><Label htmlFor="course_level">Level</Label><select id="course_level" name="level" defaultValue="Beginner" className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div className="space-y-2"><Label htmlFor="course_thumbnail">Thumbnail (optional)</Label><Input id="course_thumbnail" name="thumbnail" type="file" accept="image/*" /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" className="size-4" /> Publish immediately</label><Button disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Creating…" : "Create course"}</Button></form>
}
