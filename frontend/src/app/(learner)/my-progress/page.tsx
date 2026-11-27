import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("My progress") };
}

export default async function Page() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-5xl px-4 py-9 pb-20 sm:px-6">
      <PageHeader
        title={t("My progress")}
        description={t("See the new meanings you’ve learned on LingoPalm, one day at a time.")}
      />
      <ProgressDashboard />
    </div>
  );
}
