import type { Metadata } from "next";
import { ReviewContent } from "@/components/review/ReviewContent";
import { PageHeader } from "@/components/shared/PageHeader";
import { djangoServerFetch } from "@/lib/api/server";
import type { PaginatedResponse } from "@/types/api/common";
import type { ReviewBatch, Vocabulary } from "@/types/api/vocabulary";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("Review") };
}
export default async function Page() {
  const t = await getTranslations();

  const [batch, vocabulary] = await Promise.all([
    djangoServerFetch<ReviewBatch>(
      "/api/my-vocabulary/vocabulary/review-batch/",
      { returnTo: "/review" },
    ),
    djangoServerFetch<PaginatedResponse<Vocabulary>>(
      "/api/my-vocabulary/vocabulary/?needs_review=true&page_size=10&page=1",
      { returnTo: "/review" },
    ),
  ]);
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-9 sm:px-6">
      <PageHeader
        title={t("Review")}
        description={t("Review what’s due now, then explore all the senses in your review schedule.")}
      />
      <ReviewContent initialBatch={batch} initialVocabulary={vocabulary} />
    </div>
  );
}
