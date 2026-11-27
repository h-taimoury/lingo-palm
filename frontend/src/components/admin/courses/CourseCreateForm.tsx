"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import type { CourseDetail } from "@/types/api/courses";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function CourseCreateForm() {
  const t = useTranslations();

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set(
      "is_published",
      form.get("is_published") === "on" ? "true" : "false",
    );
    form.set("is_free", form.get("is_free") === "on" ? "true" : "false");
    const thumbnail = form.get("thumbnail");
    if (!(thumbnail instanceof File) || !thumbnail.size)
      form.delete("thumbnail");
    setBusy(true);
    setError(null);
    try {
      const course = await apiClient.post<CourseDetail, FormData>(
        "/api/courses/courses/",
        form,
      );
      router.push(`/admin/courses/${course.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <ApiErrorMessage error={error} />
      <div className="space-y-2">
        <Label htmlFor="course_title">{t("Title")}</Label>
        <Input id="course_title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="course_description">{t("Description")}</Label>
        <Textarea id="course_description" name="description" rows={5} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="course_level">{t("Level")}</Label>
        <select
          id="course_level"
          name="level"
          defaultValue="Beginner"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="Beginner">{t("Beginner")}</option>
          <option value="Intermediate">{t("Intermediate")}</option>
          <option value="Advanced">{t("Advanced")}</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="course_thumbnail">{t("Thumbnail (optional)")}</Label>
        <Input
          id="course_thumbnail"
          name="thumbnail"
          type="file"
          accept="image/*"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_published" className="size-4" />  {t("Publish immediately")}</label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_free" className="size-4" />  {t("Free for everyone")}</label>
      <Button type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? t("Creating…") : t("Create course")}
      </Button>
    </form>
  );
}
