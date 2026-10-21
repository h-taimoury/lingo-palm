import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BulkTranslate } from "@/components/admin/dictionary/BulkTranslate";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:px-8">
      <Link href="/admin/dictionary/translate" className="text-sm text-muted-foreground hover:text-foreground">← Back to translation queue</Link>
      <PageHeader title="Bulk Translate" description="Export up to 25 random untranslated senses, translate them with your AI tool, then paste the completed JSON here." />
      <BulkTranslate />
    </div>
  );
}
