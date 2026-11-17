export function formatExpiry(expiry: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
  }).format(new Date(expiry)) + " Tehran time";
}
