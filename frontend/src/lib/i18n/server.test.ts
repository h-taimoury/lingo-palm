import { expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "./server";
import { localeCookie } from "./messages";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

it("uses only the saved language cookie and renders the same locale on the server", async () => {
  for (const [value, expected] of [[undefined, "en"], ["fa", "fa"], ["invalid", "en"]] as const) {
    const get = vi.fn(() => value ? { value } : undefined);
    vi.mocked(cookies).mockResolvedValue({ get } as unknown as Awaited<ReturnType<typeof cookies>>);
    expect(await getLocale()).toBe(expected);
    expect(get).toHaveBeenCalledWith(localeCookie);
    expect((await getTranslations())("Courses")).toBe(expected === "fa" ? "دوره‌ها" : "Courses");
  }
});
