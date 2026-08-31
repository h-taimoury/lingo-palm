import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Pagination({ page, count, pageSize = 20, makeHref }: { page: number; count: number; pageSize?: number; makeHref: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  if (pages <= 1) return null
  return <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={page <= 1 ? "#" : makeHref(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}><ChevronLeft className="mr-1 size-4" /> Previous</Link><span className="text-sm text-muted-foreground">Page {page} of {pages}</span><Link aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} href={page >= pages ? "#" : makeHref(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pages && "pointer-events-none opacity-50")}>Next <ChevronRight className="ml-1 size-4" /></Link></nav>
}
