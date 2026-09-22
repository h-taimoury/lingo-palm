import "server-only"

const DEFAULT_DJANGO_ORIGIN = "http://localhost:8000"

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/u, "")
}

export const serverEnv = {
  djangoOrigin: normalizeOrigin(
    process.env.DJANGO_ORIGIN ?? process.env.NEXT_PUBLIC_DJANGO_ORIGIN ?? DEFAULT_DJANGO_ORIGIN,
  ),
  accessCookieName: process.env.JWT_ACCESS_COOKIE_NAME ?? "access_token",
  refreshCookieName: process.env.JWT_REFRESH_COOKIE_NAME ?? "refresh_token",
} as const

export function buildDjangoUrl(path: string) {
  if (/^https?:\/\//iu.test(path)) {
    return path
  }

  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${serverEnv.djangoOrigin}${normalized}`
}
