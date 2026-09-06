import "server-only"

import { cookies } from "next/headers"

import { djangoServerFetch } from "@/lib/api/server"
import { SessionExpiredError } from "@/lib/api/errors"
import { serverEnv } from "@/lib/env.server"
import type { User } from "@/types/api/users"

export async function getOptionalCurrentUser(returnTo = "/") {
  const cookieStore = await cookies()
  const hasAccess = Boolean(cookieStore.get(serverEnv.accessCookieName)?.value)
  const hasRefresh = Boolean(cookieStore.get(serverEnv.refreshCookieName)?.value)

  if (!hasAccess && !hasRefresh) return null

  try {
    return await djangoServerFetch<User>("/api/users/me/", {
      returnTo,
      refreshOnUnauthorized: hasRefresh,
    })
  } catch (error) {
    if (error instanceof SessionExpiredError) return null
    throw error
  }
}
