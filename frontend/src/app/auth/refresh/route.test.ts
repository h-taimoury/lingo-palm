import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/env.server", () => ({
  buildDjangoUrl: (path: string) => `https://backend.example${path}`,
}));

const origin = "https://lingopalm.example";
const lesson = "/courses/3/sections/8?view=learned";
const fetchMock = vi.fn<typeof fetch>();

function refreshRequest(returnTo: string, cookie = "refresh_token=old; csrftoken=csrf") {
  const url = new URL("/auth/refresh", origin);
  url.searchParams.set("returnTo", returnTo);
  return new NextRequest(url, { headers: { Cookie: cookie } });
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it("forwards session and CSRF cookies and returns rotated cookies on the lesson redirect", async () => {
  const cookies = [
    "access_token=new; Path=/; HttpOnly; Secure",
    "refresh_token=new; Path=/; HttpOnly; Secure",
  ];
  const headers = new Headers();
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  fetchMock.mockResolvedValueOnce(Response.json({}, { headers }));

  const response = await GET(refreshRequest(lesson));

  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    "https://backend.example/api/users/refresh/",
    expect.objectContaining({
      method: "POST",
      cache: "no-store",
      headers: expect.objectContaining({
        Cookie: "refresh_token=old; csrftoken=csrf",
        "X-CSRFToken": "csrf",
        Origin: origin,
      }),
    }),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`${origin}${lesson}`);
  expect(response.headers.getSetCookie()).toEqual(cookies);
});

it("goes straight to login when the CSRF cookie is missing", async () => {
  const response = await GET(refreshRequest(lesson, "refresh_token=old"));

  expect(fetchMock).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe(
    `${origin}/login?returnTo=${encodeURIComponent(lesson)}`,
  );
});

it("returns to login with the original lesson when Django rejects the refresh", async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

  const response = await GET(refreshRequest(lesson));

  expect(response.headers.get("location")).toBe(
    `${origin}/login?returnTo=${encodeURIComponent(lesson)}`,
  );
  expect(response.headers.getSetCookie()).toEqual([]);
});

it.each(["https://elsewhere.example", "//elsewhere.example"])(
  "uses the course list when the return URL is %s",
  async (returnTo) => {
    fetchMock.mockResolvedValueOnce(Response.json({}));

    const response = await GET(refreshRequest(returnTo));

    expect(response.headers.get("location")).toBe(`${origin}/courses`);
  },
);

// Keep this expected failure until return URLs are checked after normalization.
it.fails("keeps the redirect on-site when the URL parser normalizes a backslash", async () => {
  fetchMock.mockResolvedValueOnce(Response.json({}));

  const response = await GET(refreshRequest("/\\elsewhere.example"));

  expect(response.headers.get("location")).toBe(`${origin}/courses`);
});
