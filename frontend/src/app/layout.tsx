import { getTranslations } from "@/lib/i18n/server";
import type { Metadata } from "next";

import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { bNazanin, geist, geistMono } from "@/lib/fonts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
  title: { default: "LingoPalm", template: "%s · LingoPalm" },
  description:
    t("Learn English from authentic video, precise dictionary senses, and contextual subtitles."),
};
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"} className={`${geist.variable} ${geistMono.variable} ${bNazanin.variable}`}>
      <body className="min-h-dvh antialiased">
        <LocaleProvider locale={locale}>
          {children}
          <ToastProvider />
        </LocaleProvider>
      </body>
    </html>
  );
}
