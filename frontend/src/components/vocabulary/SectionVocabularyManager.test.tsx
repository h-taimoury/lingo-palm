import { beforeEach, expect, it, vi } from "vitest"
import { Children, isValidElement, type ReactElement, type ReactNode } from "react"
import type { TaughtSense } from "@/types/api/courses"
import type { VocabularyBulkAction } from "@/types/api/vocabulary"
import { SectionVocabularyManager } from "./SectionVocabularyManager"
import { VocabularyActionsMenu } from "./VocabularyActionsMenu"

const harness = vi.hoisted(() => ({ cursor: 0, state: [] as unknown[], post: vi.fn(), push: vi.fn(), query: "" }))

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: () => {},
  useId: () => "test-id",
  useMemo: (calculate: () => unknown) => calculate(),
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => {
    const index = harness.cursor++
    if (!(index in harness.state)) {
      harness.state[index] = typeof initial === "function" ? initial() : initial
    }
    return [harness.state[index], (next: unknown) => {
      harness.state[index] = typeof next === "function" ? next(harness.state[index]) : next
    }]
  },
}))
vi.mock("@/lib/api/client", () => ({ apiClient: { post: harness.post } }))
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(harness.query), useRouter: () => ({ push: harness.push }) }))

beforeEach(() => {
  harness.state = []
  harness.query = ""
  harness.post.mockReset()
  harness.push.mockReset()
})

function renderTabs(taughtSenses: TaughtSense[], signInHref?: string) {
  harness.cursor = 0
  return SectionVocabularyManager({ taughtSenses, header: null, signInHref }).props.children[0]
}

it("sends guests to sign in before saving a sense", async () => {
  const signInHref = "/login?returnTo=%2Fcourses";
  const tabs = renderTabs([], signInHref);
  await tabs.props.children[1].props.children.props.onAction("set_learned", [17]);
  expect(harness.push).toHaveBeenCalledExactlyOnceWith(signInHref);
  expect(harness.post).not.toHaveBeenCalled();
});

it("defaults to New senses and activates Already learned from the URL", () => {
  expect(renderTabs([]).props.value).toBe("new")
  harness.query = "view=learned"
  expect(renderTabs([]).props.value).toBe("learned")
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

it("lets learners select a word by its checkbox and clears selection after saving it", async () => {
  const taught = [{
    sense: { id: 17, entry: { word: "arm" } } as TaughtSense["sense"],
    is_learned: false,
    already_known: null,
    needs_review: null,
  }]

  type Control = ReactElement<{
    children?: ReactNode
    disabled?: boolean
    checked?: boolean
    onChange?: () => void
    onAction?: (action: VocabularyBulkAction) => void
    item?: TaughtSense
  }>
  function controls(node: ReactNode): Control[] {
    return Children.toArray(node).flatMap((child) =>
      isValidElement<Control["props"]>(child)
        ? [child, ...controls(child.props.children)]
        : [],
    )
  }

  function renderNewList() {
    const list = renderTabs(taught).props.children[1].props.children
    return controls(list.type(list.props))
  }

  function checkbox() {
    const card = renderNewList().find((control) => control.props.item?.sense.id === 17)!
    const render = card.type as (props: Control["props"]) => ReactElement
    return controls(render(card.props)).find((control) => control.type === "input")!
  }
  const actionMenu = () => renderNewList().find((control) =>
    control.type === VocabularyActionsMenu,
  )!

  expect(checkbox().props.checked).toBe(false)
  checkbox().props.onChange!()
  expect(checkbox().props.checked).toBe(true)
  expect(actionMenu().props.disabled).toBe(false)

  harness.post.mockResolvedValueOnce([{ sense: { id: 17 }, already_known: false, needs_review: true }])
  actionMenu().props.onAction!("set_learned")
  await vi.waitFor(() => expect(actionMenu().props.disabled).toBe(true))
  expect(harness.post).toHaveBeenCalledWith("/api/my-vocabulary/vocabulary/bulk-action/", {
    action: "set_learned", sense_ids: [17],
  })
  expect(renderNewList().some((control) => control.props.item?.sense.id === 17)).toBe(false)
})

vi.mock("@/lib/i18n/LocaleProvider", async () => {
  const { createTranslator } = await import("@/lib/i18n/messages");
  return { useLocale: () => "en", useTranslations: () => createTranslator("en") };
});
