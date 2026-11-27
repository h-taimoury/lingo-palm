export function formatExpiry(expiry: string, locale = "en") {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
  }).format(new Date(expiry)) + (locale === "fa" ? " به وقت تهران" : " Tehran time");
}
