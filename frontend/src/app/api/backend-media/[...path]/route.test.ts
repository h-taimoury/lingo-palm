import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/env.server", () => ({
  buildDjangoUrl: (path: string) => `https://backend.example${path}`,
}));

const fetchMock = vi.fn<typeof fetch>();
const requestUrl = "https://lingopalm.example/api/backend-media/pronunciation_audios/word.mp3";

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it("forwards the byte range and preserves the partial media response", async () => {
  const mediaHeaders = {
    "content-type": "audio/mpeg",
    "content-length": "4",
    "content-range": "bytes 2-5/10",
    "accept-ranges": "bytes",
  };
  fetchMock.mockResolvedValueOnce(new Response(Uint8Array.of(2, 3, 4, 5), {
    status: 206,
    headers: mediaHeaders,
  }));

  const response = await GET(new NextRequest(requestUrl, {
    headers: { Range: "bytes=2-5", Cookie: "access_token=private" },
  }));

  const [[url, options]] = fetchMock.mock.calls;
  expect(url).toBe("https://backend.example/media/pronunciation_audios/word.mp3");
  const sent = new Headers(options?.headers);
  expect(sent.get("range")).toBe("bytes=2-5");
  expect(sent.has("cookie")).toBe(false);
  expect(response.status).toBe(206);
  for (const [name, value] of Object.entries(mediaHeaders)) {
    expect(response.headers.get(name)).toBe(value);
  }
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.of(2, 3, 4, 5));
});

it("preserves an upstream missing-file response", async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

  expect((await GET(new NextRequest(requestUrl))).status).toBe(404);
});

it("returns a gateway error when the media backend is unreachable", async () => {
  fetchMock.mockRejectedValueOnce(new Error("backend connection details"));

  const response = await GET(new NextRequest(requestUrl));

  expect(response.status).toBe(502);
  expect(await response.text()).toBe("Media server unavailable");
});
