"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NavIcon } from "./NavIcon";
import { isNavItemActive, type NavItem } from "./nav-links";

type NavLinkProps = {
  item: NavItem;
  className?: string;
};

export function NavLink({ item, className }: NavLinkProps) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "after:absolute after:inset-x-3 after:-bottom-3.25 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform",
        active && "bg-primary/10 text-primary after:scale-x-100",
        className,
      )}
    >
      <NavIcon name={item.icon} className="size-4" />
      {item.title}
    </Link>
  );
}
