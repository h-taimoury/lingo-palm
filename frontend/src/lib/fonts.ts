import localFont from "next/font/local";

export const geist = localFont({
  src: "../../public/fonts/geist-font/Geist/webfonts/Geist[wght].woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-sans",
});

export const geistMono = localFont({
  src: "../../public/fonts/geist-font/GeistMono/webfonts/GeistMono[wght].woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist-mono",
});

export const bNazanin = localFont({
  src: "../../public/fonts/BNazanin.ttf",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-b-nazanin",
  fallback: ["Tahoma", "serif"],
});
