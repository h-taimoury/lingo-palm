import Link from "next/link";
import { notFound } from "next/navigation";
import { BulkSelecting } from "@/components/admin/mappings/BulkSelecting";
import { PageHeader } from "@/components/shared/PageHeader";
import { getAdminSection } from "@/lib/admin/server";

export default async function Page({ params }: { params: Promise<{ courseId: string; sectionId: string }> }) {
  const { courseId, sectionId } = await params;
  const sectionPath = `/admin/courses/${courseId}/sections/${sectionId}`;
  const section = await getAdminSection(sectionId, `${sectionPath}/bulk-selecting`);
  if (section.course.id !== Number(courseId)) notFound();
  return <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
    <div className="flex flex-wrap justify-between gap-4 text-sm text-muted-foreground">
      <Link href={sectionPath} className="hover:text-foreground">← Back to {section.title}</Link>
      <Link href={`${sectionPath}/bulk-mappings`} className="hover:text-foreground">Bulk Mappings →</Link>
    </div>
    <div className="mt-4"><PageHeader title="Bulk selecting" description="Review one subtitle cue at a time and select remaining words to teach. Use D for the previous cue and F for the next." /></div>
    <BulkSelecting key={section.id} sectionId={section.id} mappings={section.word_sense_mappings} />
  </div>;
}
