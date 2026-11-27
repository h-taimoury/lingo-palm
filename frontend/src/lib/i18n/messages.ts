import fa from "./fa.json";

export type Locale = "en" | "fa";
export const localeCookie = "lingopalm_language";

export function parseLocale(value: unknown): Locale {
  return value === "fa" ? "fa" : "en";
}

export function createTranslator(locale: Locale) {
  return (message: string, values: Record<string, string | number | null | undefined> = {}) => {
    const translated = locale === "fa" && Object.hasOwn(fa, message)
      ? (fa as Record<string, string>)[message]
      : message;
    return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
      Object.hasOwn(values, key) ? String(values[key] ?? "") : placeholder,
    );
  };
}
