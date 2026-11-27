import Link from "next/link";
import { notFound } from "next/navigation";
import { BulkMappingsWizard } from "@/components/admin/mappings/BulkMappingsWizard";
import { PageHeader } from "@/components/shared/PageHeader";
import { getAdminSection } from "@/lib/admin/server";
import { getTranslations } from "@/lib/i18n/server";

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string; sectionId: string }>;
}) {
  const t = await getTranslations();

  const { courseId, sectionId } = await params;
  const sectionPath = `/admin/courses/${courseId}/sections/${sectionId}`;
  const section = await getAdminSection(
    sectionId,
    `${sectionPath}/bulk-mappings`,
  );
  if (section.course.id !== Number(courseId)) notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <Link
        href={sectionPath}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t("← Back to {0}", { 0: section.title })}</Link>
      <div className="mt-4">
        <PageHeader
          title={t("Bulk Mappings")}
          description={t("Review suggested vocabulary, prepare dictionary entries, and import mappings for this section.")}
        />
      </div>
      <BulkMappingsWizard sectionId={section.id} />
    </div>
  );
}
