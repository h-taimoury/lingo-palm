import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env.server", () => ({ serverEnv: { djangoOrigin: "https://backend.onrender.com" } }));

import { GET, POST, PATCH, DELETE, HEAD } from "./route";

const fetchMock = vi.fn<typeof fetch>();
const context = (...path: string[]) => ({ params: Promise.resolve({ path }) });
const origin = "https://lingo-palm-frontend.vercel.app";

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe("Django API proxy", () => {
  it("forwards JSON, cookies and CSRF without spoofed host headers, and preserves each cookie", async () => {
    const cookies = [
      "access_token=access; Path=/; HttpOnly; Secure; SameSite=Lax",
      "refresh_token=refresh; Path=/; HttpOnly; Secure; SameSite=Lax",
      "csrftoken=csrf; Path=/; Expires=Wed, 01 Jan 2031 00:00:00 GMT; Secure; SameSite=Lax",
    ];
    const headers = new Headers();
    cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
    fetchMock.mockResolvedValueOnce(Response.json({ detail: "Logged in" }, { headers }));
    const response = await POST(new Request(`${origin}/api/users/login`, {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: "csrftoken=csrf", "X-CSRFToken": "csrf", Origin: origin, Host: "spoofed.example", "X-Forwarded-Host": "spoofed.example" },
      body: '{"email":"demo@example.com"}',
    }), context("users", "login"));
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://backend.onrender.com/api/users/login/");
    expect(options).toMatchObject({ method: "POST", cache: "no-store", redirect: "manual" });
    const sent = new Headers(options?.headers);
    expect(sent.get("Cookie")).toBe("csrftoken=csrf");
    expect(sent.get("X-CSRFToken")).toBe("csrf");
    expect(sent.get("Origin")).toBe(origin);
    expect(sent.has("Host")).toBe(false);
    expect(sent.has("X-Forwarded-Host")).toBe(false);
    expect(new TextDecoder().decode(options?.body as ArrayBuffer)).toBe('{"email":"demo@example.com"}');
    expect(response.headers.getSetCookie()).toEqual(cookies);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ detail: "Logged in" });
  });

  it("preserves multipart bytes and their boundary", async () => {
    const form = new FormData();
    form.append("thumbnail", new Blob(["image-bytes"]), "image.jpg");
    const request = new Request(`${origin}/api/courses/courses/1`, { method: "PATCH", body: form });
    const original = await request.clone().arrayBuffer();
    fetchMock.mockResolvedValueOnce(Response.json({ id: 1 }));
    await PATCH(request, context("courses", "courses", "1"));
    expect(fetchMock.mock.calls[0][1]?.body).toEqual(original);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("content-type")).toBe(request.headers.get("content-type"));
  });

  it("preserves queries, errors, and empty responses", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ detail: "Forbidden" }, { status: 403 }));
    const error = await GET(new Request(`${origin}/api/users/me?search=a%2Fb&page=2`), context("users", "me"));
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://backend.onrender.com/api/users/me/?search=a%2Fb&page=2");
    expect(error.status).toBe(403);
    expect(await error.json()).toEqual({ detail: "Forbidden" });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const removed = await DELETE(new Request(`${origin}/api/courses/courses/1`, { method: "DELETE" }), context("courses", "courses", "1"));
    expect(removed.status).toBe(204);
    expect(await removed.text()).toBe("");
    fetchMock.mockResolvedValueOnce(new Response(null));
    expect((await HEAD(new Request(`${origin}/api/users/me`, { method: "HEAD" }), context("users", "me"))).body).toBeNull();
  });

  it("relays rotated and deleted auth cookies", async () => {
    for (const [endpoint, cookie] of [["refresh", "access_token=new; Path=/; HttpOnly; Secure"], ["logout", "access_token=; Max-Age=0; Path=/; Secure"]]) {
      fetchMock.mockResolvedValueOnce(Response.json({}, { headers: { "Set-Cookie": cookie } }));
      const response = await POST(new Request(`${origin}/api/users/${endpoint}`, { method: "POST" }), context("users", endpoint));
      expect(response.headers.getSetCookie()).toEqual([cookie]);
    }
  });

  it("rejects traversal before forwarding and never follows an external redirect", async () => {
    for (const part of ["..", ".", "a/b", "a\\b"]) {
      expect((await GET(new Request(`${origin}/api/users`), context(part))).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "https://other.example" } }));
    expect((await GET(new Request(`${origin}/api/users/me`), context("users", "me"))).status).toBe(502);
  });

  it("keeps backend API redirects on the frontend origin", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 307, headers: { Location: "https://backend.onrender.com/api/users/me/?next=1" } }));
    const response = await GET(new Request(`${origin}/api/users/me`), context("users", "me"));
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("/api/users/me/?next=1");
  });

  it("returns a safe error when the backend is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("private connection details"));
    const response = await GET(new Request(`${origin}/api/users/me`), context("users", "me"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private connection details");
  });
});
