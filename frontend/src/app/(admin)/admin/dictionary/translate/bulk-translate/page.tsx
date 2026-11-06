import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BulkTranslation } from "@/components/admin/dictionary/BulkTranslation";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:px-8">
      <Link href="/admin/dictionary/translate" className="text-sm text-muted-foreground hover:text-foreground">← Back to translation queue</Link>
      <PageHeader title="Bulk translation" description="Export senses for AI translation, review both Persian fields, and save the completed batch." />
      <BulkTranslation />
    </div>
  );
}
