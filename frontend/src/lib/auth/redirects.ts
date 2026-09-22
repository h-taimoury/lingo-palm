export const LOGIN_PATH = "/login";
export const DEFAULT_AUTHENTICATED_PATH = "/courses";

// This function is used to validate the returnTo parameter in the login and refresh routes. It ensures that the returnTo parameter is a relative path (starts with "/") and not an absolute URL or a protocol-relative URL. If the returnTo parameter is invalid, it returns the fallback path (defaulting to DEFAULT_AUTHENTICATED_PATH).
export function safeReturnTo(
  returnTo: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//"))
    return fallback;
  return returnTo;
}

export function loginHref(returnTo?: string) {
  if (!returnTo) return LOGIN_PATH;
  return `${LOGIN_PATH}?returnTo=${encodeURIComponent(safeReturnTo(returnTo, "/"))}`;
}
