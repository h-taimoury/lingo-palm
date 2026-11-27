import type { Metadata } from "next";
import Link from "next/link";
import { SectionVocabularyManager } from "@/components/vocabulary/SectionVocabularyManager";
import { PageHeader } from "@/components/shared/PageHeader";
import { getOptionalCurrentUser } from "@/lib/auth/getOptionalCurrentUser";
import { loginHref } from "@/lib/auth/redirects";
import {
  getLearnerSection,
  getSectionTaughtSenses,
} from "@/lib/courses/learner";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("Section vocabulary") };
}
export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string; sectionId: string }>;
}) {
  const t = await getTranslations();

  const { courseId, sectionId } = await params;
  const returnTo = `/courses/${courseId}/sections/${sectionId}/vocabulary`;
  const [section, taught, user] = await Promise.all([
    getLearnerSection(courseId, sectionId, returnTo),
    getSectionTaughtSenses(sectionId, returnTo),
    getOptionalCurrentUser(returnTo),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <Link
        href={`/courses/${courseId}/sections/${sectionId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t("← Back to lesson")}</Link>
      <div className="mt-5">
        <SectionVocabularyManager
          taughtSenses={taught}
          signInHref={user ? undefined : loginHref(returnTo)}
          header={
            <PageHeader
              eyebrow={section.course.title}
              title={t("Vocabulary in {0}", { 0: section.title })}
              description={t("Each card is an exact dictionary sense taught by this section.")}
            />
          }
        />
      </div>
    </div>
  );
}
