import Link from "next/link";
import { TranslationQueue } from "@/components/admin/dictionary/TranslationQueue";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { djangoServerFetch } from "@/lib/api/server";
import type { PaginatedResponse } from "@/types/api/common";
import type { Sense } from "@/types/api/dictionary";

export default async function Page() {
  const initial = await djangoServerFetch<PaginatedResponse<Sense>>(
    "/api/dictionary/senses/?needs_translation=true",
    { returnTo: "/admin/dictionary/translate" },
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Dictionary"
        title="Translate senses"
        description="Give each meaning its Persian translation. These senses are used in your sections and are waiting to be translated."
        actions={<Link href="/admin/dictionary" className={buttonVariants({ variant: "outline" })}>Back to dictionary</Link>}
      />
      <TranslationQueue initial={initial} />
    </div>
  );
}
