import Link from "next/link";
import { notFound } from "next/navigation";
import { BulkSelecting } from "@/components/admin/mappings/BulkSelecting";
import { PageHeader } from "@/components/shared/PageHeader";
import { getAdminSection } from "@/lib/admin/server";
import { getTranslations } from "@/lib/i18n/server";

export default async function Page({ params }: { params: Promise<{ courseId: string; sectionId: string }> }) {
  const t = await getTranslations();

  const { courseId, sectionId } = await params;
  const sectionPath = `/admin/courses/${courseId}/sections/${sectionId}`;
  const section = await getAdminSection(sectionId, `${sectionPath}/bulk-selecting`);
  if (section.course.id !== Number(courseId)) notFound();
  return <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
    <div className="flex flex-wrap justify-between gap-4 text-sm text-muted-foreground">
      <Link href={sectionPath} className="hover:text-foreground">{t("← Back to {0}", { 0: section.title })}</Link>
      <Link href={`${sectionPath}/bulk-mappings`} className="hover:text-foreground">{t("Bulk Mappings →")}</Link>
    </div>
    <div className="mt-4"><PageHeader title={t("Bulk selecting")} description={t("Review one subtitle cue at a time and select remaining words to teach. Use D for the previous cue and F for the next.")} /></div>
    <BulkSelecting key={section.id} sectionId={section.id} mappings={section.word_sense_mappings} />
  </div>;
}
