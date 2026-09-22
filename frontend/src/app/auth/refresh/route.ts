import { NextRequest, NextResponse } from "next/server";

import { buildDjangoUrl } from "@/lib/env.server";
import { safeReturnTo } from "@/lib/auth/redirects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
    "/courses",
  );
  const csrf = request.cookies.get("csrftoken")?.value;

  if (!csrf)
    return NextResponse.redirect(
      new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url),
    );

  let djangoResponse: Response;
  try {
    djangoResponse = await fetch(buildDjangoUrl("/api/users/refresh/"), {
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
    });
  } catch {
    return NextResponse.redirect(
      new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url),
    );
  }

  if (!djangoResponse.ok) {
    return NextResponse.redirect(
      new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url),
    );
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  djangoResponse.headers.getSetCookie().forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });
  return response;
}
