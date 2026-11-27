"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function Footer({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations();

  return (
    <footer className="border-t bg-muted/25">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("LingoPalm home")}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-[0.65rem] font-bold text-primary-foreground">
            LP
          </span>
          <span className="font-semibold tracking-tight">LingoPalm</span>
        </Link>

        <nav
          aria-label={t("Footer")}
          className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground"
        >
          <a
            className="transition-colors hover:text-foreground"
            href="#how-it-works"
          >
            {t("How it works")}</a>
          <a
            className="transition-colors hover:text-foreground"
            href="#features"
          >
            {t("Features")}</a>
          {isAuthenticated ? (
            <>
              <Link
                className="transition-colors hover:text-foreground"
                href="/courses"
              >
                {t("Courses")}</Link>
              <Link
                className="transition-colors hover:text-foreground"
                href="/my-vocabulary"
              >
                {t("My vocabulary")}</Link>
            </>
          ) : (
            <>
              <Link
                className="transition-colors hover:text-foreground"
                href="/login"
              >
                {t("Sign in")}</Link>
              <Link
                className="transition-colors hover:text-foreground"
                href="/register"
              >
                {t("Create account")}</Link>
            </>
          )}
        </nav>

        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} LingoPalm
        </p>
      </div>
    </footer>
  );
}
