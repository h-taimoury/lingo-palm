import { expect, it, vi } from "vitest"
import type { ReactElement } from "react"
import type { TaughtSense } from "@/types/api/courses"
import type { VocabularyBulkAction } from "@/types/api/vocabulary"
import { SectionVocabularyManager } from "./SectionVocabularyManager"

const harness = vi.hoisted(() => ({ cursor: 0, state: [] as unknown[], post: vi.fn(), query: "" }))

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: () => {},
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => {
    const index = harness.cursor++
    if (!(index in harness.state)) harness.state[index] = initial
    return [harness.state[index], (next: unknown) => {
      harness.state[index] = typeof next === "function" ? next(harness.state[index]) : next
    }]
  },
}))
vi.mock("@/lib/api/client", () => ({ apiClient: { post: harness.post } }))
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(harness.query) }))

function renderTabs(taughtSenses: TaughtSense[]) {
  harness.cursor = 0
  return SectionVocabularyManager({ taughtSenses, header: null }).props.children[0]
}

it("defaults to New senses and activates Already learned from the URL", () => {
  expect(renderTabs([]).props.value).toBe("new")
  harness.query = "view=learned"
  expect(renderTabs([]).props.value).toBe("learned")
  harness.query = ""
  harness.state = []
})

it("uses saved review flags and returns an unlearned sense to the new-sense pool", async () => {
  const taught = [{
    sense: { id: 17 } as TaughtSense["sense"],
    is_learned: true,
    already_known: false,
    needs_review: true,
  }]
  function learnedList() {
    return renderTabs(taught).props.children[2].props.children as ReactElement<{
      items: TaughtSense[]
      onAction: (action: VocabularyBulkAction, ids: number[]) => Promise<void>
    }>
  }

  harness.post.mockResolvedValueOnce([{ sense: { id: 17 }, already_known: true, needs_review: true }])
  await learnedList().props.onAction("set_already_known", [17])
  expect(learnedList().props.items[0]).toMatchObject({
    is_learned: true, already_known: true, needs_review: true,
  })

  harness.post.mockResolvedValueOnce({ sense_ids: [17] })
  await learnedList().props.onAction("unset_learned", [17])
  expect(harness.post).toHaveBeenLastCalledWith("/api/my-vocabulary/vocabulary/bulk-action/", {
    action: "unset_learned", sense_ids: [17],
  })
  expect(learnedList().props.items[0]).toMatchObject({
    is_learned: false, already_known: null, needs_review: null,
  })
})
