import { expect, it, vi } from "vitest"
import { djangoServerFetch } from "@/lib/api/server"
import { getAllVocabulary } from "./server"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/api/server", () => ({ djangoServerFetch: vi.fn() }))

it("collects learned senses across every API page", async () => {
  const fetch = vi.mocked(djangoServerFetch)
  const first = { sense: { id: 11 } }
  const second = { sense: { id: 12 } }
  fetch.mockResolvedValueOnce({ results: [first], next: "?page=2" })
  fetch.mockResolvedValueOnce({ results: [second], next: null })

  await expect(getAllVocabulary("/my-vocabulary")).resolves.toEqual([first, second])
  expect(fetch.mock.calls).toEqual([
    ["/api/my-vocabulary/vocabulary/?page=1&page_size=100", { returnTo: "/my-vocabulary" }],
    ["/api/my-vocabulary/vocabulary/?page=2&page_size=100", { returnTo: "/my-vocabulary" }],
  ])
})
