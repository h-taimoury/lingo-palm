import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";
import type { NavItem } from "./nav-links";
import { NavLink } from "./NavLink";
import { NavbarMenuSheet } from "./NavbarMenuSheet";

type NavbarProps = {
  homeHref?: string;
  links: readonly NavItem[];
  utilityLinks?: readonly NavItem[];
  contextLabel?: string;
  userLabel: string;
};

export function Navbar({
  homeHref = "/",
  links,
  utilityLinks = [],
  contextLabel,
  userLabel,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={homeHref}
          className="group flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={
            contextLabel ? `LingoPalm ${contextLabel} home` : "LingoPalm home"
          }
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-bold tracking-tight text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:-rotate-3">
            LP
          </span>
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight">
              LingoPalm
            </span>
            {contextLabel ? (
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">
                {contextLabel}
              </span>
            ) : null}
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden flex-1 items-center gap-1 lg:flex"
        >
          {links.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-1 lg:flex">
          {utilityLinks.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              className="px-2.5 after:hidden"
            />
          ))}
          <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
          <span
            className="max-w-36 truncate px-1 text-xs text-muted-foreground"
            title={userLabel}
          >
            {userLabel}
          </span>
          <LogoutButton />
        </div>

        <div className="ml-auto lg:hidden">
          <NavbarMenuSheet
            links={links}
            utilityLinks={utilityLinks}
            contextLabel={contextLabel}
            userLabel={userLabel}
          />
        </div>
      </div>
    </header>
  );
}
