import Link from "next/link";

import { DictionaryEntryCard } from "@/components/admin/dictionary/DictionaryEntryCard";
import { DictionarySearchForm } from "@/components/admin/dictionary/DictionarySearchForm";
import { EntryForm } from "@/components/admin/dictionary/EntryForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { buttonVariants } from "@/components/ui/button";
import { getDictionaryEntries } from "@/lib/admin/server";
import { parsePositivePage, withPage } from "@/lib/courses/query";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parsePositivePage(params.page);
  const search = (params.search ?? "").trim();

  const data = await getDictionaryEntries(
    page,
    search,
    withPage("/admin/dictionary", page, { search }),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
      <PageHeader
        title="Dictionary"
        description="Entries group a word and part of speech; course learning targets individual senses."
        actions={
          publicEnv.enableScraper ? (
            <Link
              href="/admin/dictionary/scrape"
              className={cn(buttonVariants())}
            >
              Scrape word
            </Link>
          ) : undefined
        }
      />

      <details className="mt-6 rounded-xl border bg-card">
        <summary className="cursor-pointer p-4 font-medium">
          Create an entry manually
        </summary>

        <div className="border-t p-5">
          <EntryForm />
        </div>
      </details>

      <DictionarySearchForm search={search} />

      <div className="mt-6 grid gap-5">
        {data.results.map((entry) => (
          <DictionaryEntryCard key={entry.id} entry={entry} />
        ))}

        {!data.results.length ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No dictionary entries found.
          </p>
        ) : null}
      </div>

      <Pagination
        page={page}
        count={data.count}
        makeHref={(next) =>
          withPage("/admin/dictionary", next, {
            search,
          })
        }
      />
    </div>
  );
}
