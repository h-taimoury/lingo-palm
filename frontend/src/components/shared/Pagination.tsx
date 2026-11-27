import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getTranslations } from "@/lib/i18n/server";

export async function Pagination({ page, count, pageSize = 20, makeHref }: { page: number; count: number; pageSize?: number; makeHref: (page: number) => string }) {
  const t = await getTranslations();

  const pages = Math.max(1, Math.ceil(count / pageSize))
  if (pages <= 1) return null
  return <nav aria-label={t("Pagination")} className="mt-8 flex items-center justify-between gap-4"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={page <= 1 ? "#" : makeHref(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}><ChevronLeft className="me-1 size-4 rtl:rotate-180" />  {t("Previous")}</Link><span className="text-sm text-muted-foreground">{t("Page {0} of {1}", { 0: page, 1: pages })}</span><Link aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} href={page >= pages ? "#" : makeHref(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pages && "pointer-events-none opacity-50")}>{t("Next")} <ChevronRight className="ms-1 size-4 rtl:rotate-180" /></Link></nav>
}
