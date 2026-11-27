import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "@/lib/i18n/server";

export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EmailAuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <Link href="/" className="mb-4 inline-flex text-sm text-muted-foreground underline underline-offset-4">{t("Back to home")}</Link>
        <Card><CardContent className="space-y-5 pt-6">{children}</CardContent></Card>
        <p className="mt-5 text-center text-sm"><Link href="/login" className="underline underline-offset-4">{t("Back to sign in")}</Link></p>
      </div>
    </main>
  );
}
