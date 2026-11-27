"use client";

import Link from "next/link";

import { AccountMenu } from "./AccountMenu";
import type { NavItem } from "./nav-links";
import { NavLink } from "./NavLink";
import { NavbarMenuSheet } from "./NavbarMenuSheet";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

type NavbarProps = {
  homeHref?: string;
  links: readonly NavItem[];
  utilityLinks?: readonly NavItem[];
  contextLabel?: string;
  userLabel?: string;
};

export function Navbar({
  homeHref = "/",
  links,
  utilityLinks = [],
  contextLabel,
  userLabel,
}: NavbarProps) {
  const t = useTranslations();

  const secondaryLinks = utilityLinks.filter((item) => item.href !== "/account");
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={homeHref}
          className="group flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={
            contextLabel ? t("LingoPalm {0} home", { 0: t(contextLabel) }) : t("LingoPalm home")
          }
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-bold tracking-tight text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:-rotate-3">
            LP
          </span>
          <span className="hidden leading-tight min-[400px]:block">
            <span className="block font-semibold tracking-tight">
              LingoPalm
            </span>
            {contextLabel ? (
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">
                {t(contextLabel)}
              </span>
            ) : null}
          </span>
        </Link>

        <nav
          aria-label={t("Primary navigation")}
          className="hidden flex-1 items-center gap-1 lg:flex"
        >
          {links.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <div className="hidden items-center gap-1 lg:flex">
          {secondaryLinks.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              className="px-2.5 after:hidden"
            />
          ))}
          </div>
          {userLabel ? <AccountMenu userLabel={userLabel} /> : <Link className="text-sm font-medium underline-offset-4 hover:underline" href="/login">{t("Sign in")}</Link>}

        <div className="lg:hidden">
          <NavbarMenuSheet
            links={links}
            utilityLinks={secondaryLinks}
            contextLabel={contextLabel}
          />
        </div>
        </div>
      </div>
    </header>
  );
}
