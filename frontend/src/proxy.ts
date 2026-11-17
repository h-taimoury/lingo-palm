import { NextRequest, NextResponse } from "next/server";

const protectedMatchers = [
  "/my-vocabulary",
  "/my-progress",
  "/payments",
  "/review",
  "/account",
  "/admin",
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedMatchers.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const accessName = process.env.JWT_ACCESS_COOKIE_NAME ?? "access_token";
  const refreshName = process.env.JWT_REFRESH_COOKIE_NAME ?? "refresh_token";
  const hasAccess = Boolean(request.cookies.get(accessName)?.value);
  const hasRefresh = Boolean(request.cookies.get(refreshName)?.value);

  if (isProtected && !hasAccess && !hasRefresh) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const headers = new Headers(request.headers);
  headers.set("x-lingopalm-path", `${pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/courses/:path*",
    "/plans",
    "/payments/:path*",
    "/my-vocabulary/:path*",
    "/my-progress/:path*",
    "/review/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
