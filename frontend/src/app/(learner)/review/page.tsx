import type { Metadata } from "next";
import Link from "next/link";
import { ReviewSession } from "@/components/review/ReviewSession";
import { PageHeader } from "@/components/shared/PageHeader";
import { djangoServerFetch } from "@/lib/api/server";
import type { ReviewBatch } from "@/types/api/vocabulary";

export const metadata: Metadata = { title: "Review" };
export default async function Page() {
  const data = await djangoServerFetch<ReviewBatch>(
    "/api/my-vocabulary/vocabulary/review-batch/",
    { returnTo: "/review" },
  );
  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <PageHeader
        title="Review"
        description="Recall the meaning, flip the card, then choose Forgot or Remembered to schedule your next review."
      />
      <Link href="/review/all" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
        View all review senses
      </Link>
      <div className="mt-8">
        <ReviewSession initialData={data} />
      </div>
    </div>
  );
}
