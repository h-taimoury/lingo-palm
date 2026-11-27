"use client";

import { SearchForm } from "@/components/shared/SearchForm";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function CourseSearchForm({ search }: { search: string }) {
  const t = useTranslations();

  return (
    <SearchForm
      action="/courses"
      search={search}
      label={t("Search courses")}
      placeholder={t("Search courses, descriptions, or levels…")}
    />
  );
}
