import Link from "next/link"
import { BarChart3, BookOpen, GraduationCap, LibraryBig, UsersRound, WandSparkles } from "lucide-react"

import { LogoutButton } from "@/components/auth/LogoutButton"
import { publicEnv } from "@/lib/env"
import type { User } from "@/types/api/users"

export function AdminNav({ user }: { user: User }) {
  const links = [
    ["/admin/courses", "Courses", GraduationCap],
    ["/admin/dictionary", "Dictionary", LibraryBig],
    ["/admin/users", "Users", UsersRound],
    ["/admin/analytics", "Analytics", BarChart3],
    ...(publicEnv.enableScraper ? [["/admin/dictionary/scrape", "Scraper", WandSparkles] as const] : []),
  ] as const
  return <header className="border-b bg-background"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8"><Link href="/admin/courses" className="font-semibold tracking-tight">LingoPalm Admin</Link><nav className="flex flex-1 flex-wrap gap-1">{links.map(([href,label,Icon]) => <Link key={href} href={href} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"><Icon className="size-3.5" />{label}</Link>)}</nav><Link href="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><BookOpen className="size-4" />Learner view</Link><span className="hidden text-xs text-muted-foreground lg:inline">{user.email}</span><LogoutButton /></div></header>
}
