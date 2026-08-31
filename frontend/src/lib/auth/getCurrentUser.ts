import "server-only"

import { djangoServerFetch, getCurrentRequestPath } from "@/lib/api/server"
import type { User } from "@/types/api/users"

export async function getCurrentUser() {
  const returnTo = await getCurrentRequestPath("/courses")
  return djangoServerFetch<User>("/api/users/me/", { returnTo })
}
