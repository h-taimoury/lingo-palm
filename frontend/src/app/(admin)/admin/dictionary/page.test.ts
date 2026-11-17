import { expect, it, vi } from "vitest";
import { getDictionaryEntries } from "@/lib/admin/server";
import Page from "./page";

vi.mock("@/lib/admin/server", () => ({
  getDictionaryEntries: vi.fn().mockResolvedValue({ count: 0, results: [] }),
}));

it("uses the first search value when the URL repeats the parameter", async () => {
  await Page({
    searchParams: Promise.resolve({ search: [" run ", "walk"] }),
  });

  expect(getDictionaryEntries).toHaveBeenCalledWith(
    1,
    "run",
    "/admin/dictionary?page=1&search=run",
  );
});
