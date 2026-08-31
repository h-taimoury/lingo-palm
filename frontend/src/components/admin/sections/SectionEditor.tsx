"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import type { SectionDetail } from "@/types/api/courses"

export function SectionEditor({ section }: { section: SectionDetail }) { const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const body = { title: String(form.get("title") ?? ""), order: Number(form.get("order")), video_url: String(form.get("video_url") ?? ""), is_published: form.get("is_published") === "on" }; setBusy(true); setError(null); try { await apiClient.patch(`/api/courses/sections/${section.id}/`, body); router.refresh() } catch (caught) { setError(caught) } finally { setBusy(false) } } return <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Section details</h2><ApiErrorMessage error={error} /><div className="space-y-2"><Label htmlFor="section_title">Title</Label><Input id="section_title" name="title" defaultValue={section.title} required /></div><div className="space-y-2"><Label htmlFor="section_order">Order</Label><Input id="section_order" name="order" type="number" min={0} defaultValue={section.order} required /></div><div className="space-y-2"><Label htmlFor="section_video">Video URL</Label><Input id="section_video" name="video_url" type="url" defaultValue={section.video_url} required /><p className="text-xs text-muted-foreground">Progressive files and .m3u8 HLS streams are supported by the lesson player.</p></div><label className="flex items-center gap-2 text-sm"><input className="size-4" type="checkbox" name="is_published" defaultChecked={section.is_published} /> Published</label><Button disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Saving…" : "Save section"}</Button></form> }
