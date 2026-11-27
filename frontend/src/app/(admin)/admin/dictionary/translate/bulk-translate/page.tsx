import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BulkTranslation } from "@/components/admin/dictionary/BulkTranslation";
import { getTranslations } from "@/lib/i18n/server";

export default async function Page() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:px-8">
      <Link href="/admin/dictionary/translate" className="text-sm text-muted-foreground hover:text-foreground">{t("← Back to translation queue")}</Link>
      <PageHeader title={t("Bulk translation")} description={t("Export senses for AI translation, review both Persian fields, and save the completed batch.")} />
      <BulkTranslation />
    </div>
  );
}
