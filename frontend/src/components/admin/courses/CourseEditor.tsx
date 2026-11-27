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
import type { CourseDetail, CourseWriteRequest } from "@/types/api/courses";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function CourseEditor({ course }: { course: CourseDetail }) {
  const t = useTranslations();

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: CourseWriteRequest = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      level: String(form.get("level")) as CourseWriteRequest["level"],
      is_published: form.get("is_published") === "on",
      is_free: form.get("is_free") === "on",
    };
    setBusy(true);
    setError(null);
    try {
      await apiClient.patch(`/api/courses/courses/${course.id}/`, body);
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{t("Course details")}</h2>
      <ApiErrorMessage error={error} />
      <div className="space-y-2">
        <Label htmlFor="edit_course_title">{t("Title")}</Label>
        <Input
          id="edit_course_title"
          name="title"
          defaultValue={course.title}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit_course_desc">{t("Description")}</Label>
        <Textarea
          id="edit_course_desc"
          name="description"
          defaultValue={course.description}
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit_course_level">{t("Level")}</Label>
        <select
          id="edit_course_level"
          name="level"
          defaultValue={course.level}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="Beginner">{t("Beginner")}</option>
          <option value="Intermediate">{t("Intermediate")}</option>
          <option value="Advanced">{t("Advanced")}</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={course.is_published}
          className="size-4"
        />{" "}
        {t("Published")}</label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_free" defaultChecked={course.is_free} className="size-4" />  {t("Free for everyone")}</label>
      <Button type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? t("Saving…") : t("Save course")}
      </Button>
    </form>
  );
}
