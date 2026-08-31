import "server-only"

import { serverEnv } from "@/lib/env.server"

export function proxyDjangoMediaUrl(value: string | null | undefined) {
  if (!value) return null

  try {
    const url = new URL(value, serverEnv.djangoOrigin)
    const django = new URL(serverEnv.djangoOrigin)
    if (url.origin === django.origin && url.pathname.startsWith("/media/")) {
      return `/api/backend-media/${url.pathname.slice("/media/".length)}${url.search}`
    }
  } catch {
    // Fall through and return the original value.
  }

  return value
}
