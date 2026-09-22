import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { ApiError, SessionExpiredError } from "@/lib/api/errors";
import { buildDjangoBrowserUrl } from "@/lib/env.client";

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn();

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DJANGO_ORIGIN", "https://api.lingopalm.com/");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("document", { cookie: "csrftoken=csrf-test" });
  vi.stubGlobal("window", {
    location: { origin: "https://lingopalm.com", pathname: "/courses", search: "", assign },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("direct Django requests", () => {
  it("normalizes API paths and preserves query strings", () => {
    for (const path of ["/api/users/me", "api/users/me/", "users/me/"]) {
      expect(buildDjangoBrowserUrl(path)).toBe("https://api.lingopalm.com/api/users/me/");
    }
    expect(buildDjangoBrowserUrl("/api/courses/courses?search=a%2Fb&page=2"))
      .toBe("https://api.lingopalm.com/api/courses/courses/?search=a%2Fb&page=2");
  });

  it("sends registration JSON, credentials, and CSRF directly to Django", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 1 }, { status: 201 }));
    const body = { email: "learner@example.com", password: "test-password" };
    await expect(apiClient.post("/api/users/register/", body, { retryOnUnauthorized: false }))
      .resolves.toEqual({ id: 1 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.lingopalm.com/api/users/register/");
    expect(options).toMatchObject({ method: "POST", credentials: "include", body: JSON.stringify(body) });
    expect(new Headers(options?.headers).get("X-CSRFToken")).toBe("csrf-test");
  });

  it("lets the browser set the multipart boundary for uploads", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 1 }));
    const body = new FormData();
    body.append("thumbnail", new Blob(["image"]), "image.png");
    await apiClient.patch("/api/courses/courses/1/", body);
    const options = fetchMock.mock.calls[0][1];
    expect(options?.body).toBe(body);
    expect(new Headers(options?.headers).has("Content-Type")).toBe(false);
  });

  it("refreshes once for concurrent unauthorized requests and retries directly", async () => {
    let releaseRefresh!: (response: Response) => void;
    let calls = 0;
    fetchMock.mockImplementation(async (url) => {
      if (String(url).endsWith("/users/refresh/")) {
        return new Promise<Response>((resolve) => { releaseRefresh = resolve; });
      }
      calls += 1;
      return calls <= 2 ? Response.json({}, { status: 401 }) : Response.json({ id: 1 });
    });
    const first = apiClient.get("/api/users/me/");
    const second = apiClient.get("/api/users/me/");
    await vi.waitFor(() => expect(releaseRefresh).toBeTypeOf("function"));
    releaseRefresh(Response.json({ detail: "Refreshed" }));
    await expect(Promise.all([first, second])).resolves.toEqual([{ id: 1 }, { id: 1 }]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/users/refresh/"));
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0][0]).toBe("https://api.lingopalm.com/api/users/refresh/");
    expect(refreshCalls[0][1]?.credentials).toBe("include");
    expect(new Headers(refreshCalls[0][1]?.headers).get("X-CSRFToken")).toBe("csrf-test");
  });

  it("does not refresh again if the retried request is unauthorized", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ detail: "Refreshed" }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }));
    await expect(apiClient.get("/api/users/me/")).rejects.toBeInstanceOf(SessionExpiredError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("stops after a failed refresh and redirects to login", async () => {
    fetchMock.mockImplementation(async () => Response.json({}, { status: 401 }));
    await expect(apiClient.get("/api/users/me/")).rejects.toBeInstanceOf(SessionExpiredError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(assign).toHaveBeenCalledWith("https://lingopalm.com/login?returnTo=%2Fcourses");
  });

  it("preserves validation errors from Django", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ email: ["Already registered."] }, { status: 400 }));
    await expect(apiClient.post("/api/users/register/", {})).rejects.toMatchObject({
      status: 400, fieldErrors: { email: ["Already registered."] },
    });
  });

  it("reports connection failures and supports empty delete responses", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(apiClient.get("/api/users/me/")).rejects.toBeInstanceOf(ApiError);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiClient.delete("/api/courses/courses/1/")).resolves.toBeNull();
  });
});
