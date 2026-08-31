import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: { default: "LingoPalm", template: "%s · LingoPalm" },
  description:
    "Learn English from authentic video, precise dictionary senses, and contextual subtitles.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
