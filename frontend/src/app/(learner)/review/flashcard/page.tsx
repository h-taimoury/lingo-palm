import type { Metadata } from "next";
import Link from "next/link";
import { FlashcardDeck } from "@/components/review/FlashcardDeck";
import { PageHeader } from "@/components/shared/PageHeader";
import { djangoServerFetch } from "@/lib/api/server";
import type { PaginatedResponse } from "@/types/api/common";
import type { Vocabulary } from "@/types/api/vocabulary";

export const metadata: Metadata = { title: "Flashcard review" };
export default async function Page() {
  const data = await djangoServerFetch<PaginatedResponse<Vocabulary>>(
    "/api/my-vocabulary/vocabulary/?needs_review=true&page_size=10&page=1",
    { returnTo: "/review/flashcard" },
  );
  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <PageHeader
        title="Flashcard review"
        description="Review up to 10 senses at a time. Click a card to flip between its sense and definition. Marking a card reviewed removes it from the review queue without unlearning it."
        actions={
          <Link
            href="/review/clip"
            className="text-sm font-medium underline underline-offset-4"
          >
            Clip review
          </Link>
        }
      />
      <div className="mt-8">
        <FlashcardDeck initialData={data} />
      </div>
    </div>
  );
}
