import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t("Page not found")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("The item may have been removed, unpublished, or the address may be incorrect.")}</p>
        <Link href="/courses" className={cn(buttonVariants(), "mt-6")}>
          {t("Go to courses")}</Link>
      </div>
    </main>
  );
}
