"use client";

import { createContext, useContext, useMemo } from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { createTranslator, type Locale } from "./messages";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <LocaleContext value={locale}>
      <DirectionProvider direction={locale === "fa" ? "rtl" : "ltr"}>
        {children}
      </DirectionProvider>
    </LocaleContext>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useTranslations() {
  const locale = useLocale();
  return useMemo(() => createTranslator(locale), [locale]);
}
