"use client";

import { SearchForm } from "@/components/shared/SearchForm";

export function CourseSearchForm({ search }: { search: string }) {
  return (
    <SearchForm
      action="/courses"
      search={search}
      label="Search courses"
      placeholder="Search courses, descriptions, or levels…"
    />
  );
}
