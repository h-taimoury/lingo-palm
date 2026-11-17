import type { Metadata } from "next";
import Link from "next/link";
import { FlashcardDeck } from "@/components/review/FlashcardDeck";
import { PageHeader } from "@/components/shared/PageHeader";
import { djangoServerFetch } from "@/lib/api/server";
import type { PaginatedResponse } from "@/types/api/common";
import type { Vocabulary } from "@/types/api/vocabulary";

export const metadata: Metadata = { title: "All review senses" };

export default async function Page() {
  const data = await djangoServerFetch<PaginatedResponse<Vocabulary>>(
    "/api/my-vocabulary/vocabulary/?needs_review=true&page_size=10&page=1",
    { returnTo: "/review/all" },
  );
  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <PageHeader
        title="All review senses"
        description="Browse the senses in your review schedule. Stop reviewing a sense whenever you want."
      />
      <Link href="/review" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
        Review due senses
      </Link>
      <div className="mt-8">
        <FlashcardDeck initialData={data} />
      </div>
    </div>
  );
}
