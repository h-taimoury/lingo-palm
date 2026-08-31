import Link from "next/link"
import { BookOpen, Library, Shield, UserRound } from "lucide-react"

import { LogoutButton } from "@/components/auth/LogoutButton"
import type { User } from "@/types/api/users"

export function LearnerNav({ user }: { user: User }) {
  return <header className="border-b bg-background/95"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 lg:px-8"><Link href="/courses" className="mr-2 font-semibold tracking-tight">LingoPalm</Link><nav className="flex flex-1 flex-wrap items-center gap-1 text-sm"><Nav href="/courses" icon={BookOpen}>Courses</Nav><Nav href="/my-vocabulary" icon={Library}>Vocabulary</Nav><Nav href="/review/flashcard" icon={BookOpen}>Review</Nav><Nav href="/account" icon={UserRound}>Account</Nav>{user.is_staff ? <Nav href="/admin/courses" icon={Shield}>Admin</Nav> : null}</nav><span className="hidden max-w-48 truncate text-xs text-muted-foreground md:inline">{user.full_name || user.email}</span><LogoutButton /></div></header>
}
function Nav({ href, icon: Icon, children }: { href: string; icon: typeof BookOpen; children: React.ReactNode }) { return <Link href={href} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"><Icon className="size-3.5" />{children}</Link> }
