"use client";

import { SearchForm } from "@/components/shared/SearchForm";

export function DictionarySearchForm({ search }: { search: string }) {
  return (
    <SearchForm
      action="/admin/dictionary"
      search={search}
      label="Search dictionary"
      placeholder="Search word, part of speech or sense title"
    />
  );
}
