"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { NavIcon } from "./NavIcon"
import { isNavItemActive, type NavItem } from "./nav-links"

type SheetLinkProps = {
  item: NavItem
  onNavigate: () => void
}

export function SheetLink({ item, onNavigate }: SheetLinkProps) {
  const pathname = usePathname()
  const active = isNavItemActive(pathname, item)

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-base font-medium text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/10 text-primary",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground",
          active && "bg-primary text-primary-foreground",
        )}
      >
        <NavIcon name={item.icon} className="size-4.5" />
      </span>
      {item.title}
    </Link>
  )
}
