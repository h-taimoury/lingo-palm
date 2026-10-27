import { serverEnv } from "@/lib/env.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow a sleeping Render free service to start (Vercel Fluid compute).
export const maxDuration = 120;

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context) {
  const { path } = await context.params;
  if (!path.length || path.some((part) => !part || part === "." || part === ".." || /[\\/\u0000-\u001f]/u.test(part))) {
    return Response.json({ detail: "Invalid API path." }, { status: 400 });
  }

  // The destination is server-configured; a caller cannot select another host.
  const target = new URL(`/api/${path.map(encodeURIComponent).join("/")}/`, serverEnv.djangoOrigin);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "x-csrftoken", "origin", "referer"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(110_000)]),
    });
  } catch {
    return Response.json({ detail: "Backend unavailable. Please try again shortly." }, {
      status: 502, headers: { "Cache-Control": "no-store" },
    });
  }

  const outgoing = new Headers({ "Cache-Control": "private, no-store" });
  for (const name of ["content-type", "content-disposition", "allow", "www-authenticate", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) outgoing.set(name, value);
  }
  const location = upstream.headers.get("location");
  if (location) {
    const redirect = new URL(location, target);
    if (redirect.origin !== target.origin || !redirect.pathname.startsWith("/api/")) {
      await upstream.body?.cancel();
      return Response.json({ detail: "Unexpected backend redirect." }, { status: 502 });
    }
    outgoing.set("Location", `${redirect.pathname}${redirect.search}`);
  }
  // Keep these separate: JWT, refresh, and CSRF cookies each have their own
  // attributes (including Expires values containing commas).
  for (const cookie of upstream.headers.getSetCookie()) outgoing.append("Set-Cookie", cookie);

  const body = request.method === "HEAD" || [204, 205, 304].includes(upstream.status) ? null : upstream.body;
  return new Response(body, { status: upstream.status, headers: outgoing });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as HEAD, proxy as OPTIONS };
