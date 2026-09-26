import localFont from "next/font/local";

export const bNazanin = localFont({
  src: "../../public/fonts/BNazanin.ttf",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-b-nazanin",
  fallback: ["Tahoma", "serif"],
});
