import { NextRequest, NextResponse } from "next/server"

import { buildDjangoUrl } from "@/lib/env.server"
import { safeReturnTo } from "@/lib/auth/redirects"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"), "/courses")
  const csrf = request.cookies.get("csrftoken")?.value

  if (!csrf) return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url))

  let upstream: Response
  try {
    upstream = await fetch(buildDjangoUrl("/api/users/refresh/"), {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "X-CSRFToken": csrf,
        Origin: request.nextUrl.origin,
      },
      body: JSON.stringify({}),
    })
  } catch {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url))
  }

  if (!upstream.ok) {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url))
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url))
  const enhanced = upstream.headers as Headers & { getSetCookie?: () => string[] }
  const setCookies = enhanced.getSetCookie?.() ?? []
  if (setCookies.length) setCookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie))
  else {
    const cookie = upstream.headers.get("set-cookie")
    if (cookie) response.headers.append("Set-Cookie", cookie)
  }
  return response
}
