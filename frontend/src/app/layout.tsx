import type { Metadata } from "next";

import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { bNazanin, geist, geistMono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "LingoPalm", template: "%s · LingoPalm" },
  description:
    "Learn English from authentic video, precise dictionary senses, and contextual subtitles.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${bNazanin.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
