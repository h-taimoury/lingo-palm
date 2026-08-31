import { NextRequest } from "next/server"

import { buildDjangoUrl } from "@/lib/env.server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PREFIX = "/api/backend-media/"

export async function GET(request: NextRequest) {
  const relative = request.nextUrl.pathname.slice(PREFIX.length)
  const headers = new Headers()
  const range = request.headers.get("range")
  if (range) headers.set("Range", range)

  let upstream: Response
  try {
    upstream = await fetch(buildDjangoUrl(`/media/${relative}`), {
      headers,
      cache: "no-store",
    })
  } catch {
    return new Response("Media server unavailable", { status: 502 })
  }

  const outgoing = new Headers()
  for (const name of [
    "content-type",
    "content-length",
    "cache-control",
    "etag",
    "last-modified",
    "accept-ranges",
    "content-range",
  ]) {
    const value = upstream.headers.get(name)
    if (value) outgoing.set(name, value)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outgoing,
  })
}
