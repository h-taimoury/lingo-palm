import { NextRequest } from "next/server";

import { buildDjangoUrl } from "@/lib/env.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "/api/backend/";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isCrossSiteUnsafeRequest(request: NextRequest) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return true;

  const origin = request.headers.get("origin");
  return Boolean(origin && origin !== request.nextUrl.origin);
}

function backendUrl(request: NextRequest) {
  // Next.js may normalize the browser-facing gateway URL by removing its
  // trailing slash. Django/DRF routes in this project are slash-terminated,
  // and this proxy deliberately uses redirect: "manual", so forwarding a
  // slashless API path would expose Django's APPEND_SLASH 301 to the client.
  // Normalize the upstream API path here instead of relying on redirects.
  const relative = request.nextUrl.pathname.slice(PREFIX.length);
  const normalizedRelative = relative.replace(/^\/+|\/+$/gu, "");
  const url = new URL(buildDjangoUrl(`/api/${normalizedRelative}/`));
  url.search = request.nextUrl.search;
  return url;
}

function upstreamHeaders(request: NextRequest) {
  const headers = new Headers();
  for (const name of [
    "accept",
    "content-type",
    "cookie",
    "x-csrftoken",
    "range",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Django's CSRF validation checks Origin for unsafe HTTPS requests. Because
  // this Route Handler is the browser-facing same-origin gateway, explicitly
  // forward the frontend origin rather than relying on server-fetch defaults.
  headers.set("Origin", request.nextUrl.origin);
  return headers;
}

function copyResponseHeaders(upstream: Response) {
  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-disposition",
    "cache-control",
    "etag",
    "last-modified",
    "accept-ranges",
    "content-range",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  const enhanced = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = enhanced.getSetCookie?.() ?? [];
  if (cookies.length) {
    cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  } else {
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) headers.append("Set-Cookie", setCookie);
  }

  return headers;
}

async function proxy(request: NextRequest) {
  if (isCrossSiteUnsafeRequest(request)) {
    return Response.json(
      { detail: "Cross-site requests are not allowed." },
      { status: 403 },
    );
  }

  const method = request.method.toUpperCase();
  const body = ["GET", "HEAD"].includes(method)
    ? undefined
    : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(request), {
      method,
      headers: upstreamHeaders(request),
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { detail: "The Django API is unavailable." },
      { status: 502 },
    );
  }

  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: copyResponseHeaders(upstream),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
