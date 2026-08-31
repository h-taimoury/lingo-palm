export const LOGIN_PATH = "/login"
export const DEFAULT_AUTHENTICATED_PATH = "/courses"

export function safeReturnTo(value: string | null | undefined, fallback = DEFAULT_AUTHENTICATED_PATH) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}

export function loginHref(returnTo?: string) {
  if (!returnTo) return LOGIN_PATH
  return `${LOGIN_PATH}?returnTo=${encodeURIComponent(safeReturnTo(returnTo, "/"))}`
}
