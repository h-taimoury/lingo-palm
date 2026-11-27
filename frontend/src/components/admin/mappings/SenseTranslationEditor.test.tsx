import { expect, it, vi } from "vitest"
import type { Sense } from "@/types/api/dictionary"
import { SenseTranslationEditor } from "./SenseTranslationEditor"

const harness = vi.hoisted(() => ({ cursor: 0, state: [] as unknown[], patch: vi.fn() }))
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = harness.cursor++
    if (!(index in harness.state)) harness.state[index] = initial
    return [harness.state[index], (value: unknown) => { harness.state[index] = value }]
  },
}))
vi.mock("@/lib/api/client", () => ({ apiClient: { patch: harness.patch } }))
vi.mock("@/lib/i18n/LocaleProvider", () => ({ useTranslations: () => (value: string) => value }))

it("preserves untouched null fields, accepts longer glosses, and clears saved translations", async () => {
  let sense = { id: 17, translation: null, short_translation: null } as Sense
  const onSaved = vi.fn((saved: Sense) => { sense = saved })
  function render() {
    harness.cursor = 0
    return SenseTranslationEditor({ sense, onSaved })
  }
  render().props.onClick()
  const values = new Map([["translation", ""], ["short_translation", "one two three"]])
  const originalFormData = globalThis.FormData
  vi.stubGlobal("FormData", class { get(name: string) { return values.get(name) } })
  try {
    harness.patch.mockResolvedValueOnce({ ...sense, short_translation: "one two three" })
    await render().props.onSubmit({ preventDefault() {}, currentTarget: {} })
    expect(harness.patch).toHaveBeenLastCalledWith("/api/dictionary/senses/17/", {
      short_translation: "one two three",
    })
    expect(onSaved).toHaveBeenCalledOnce()
    render().props.onClick()
    values.set("short_translation", "")
    harness.patch.mockResolvedValueOnce({ ...sense, short_translation: "" })
    await render().props.onSubmit({ preventDefault() {}, currentTarget: {} })
    expect(harness.patch).toHaveBeenLastCalledWith("/api/dictionary/senses/17/", {
      short_translation: "",
    })
  } finally {
    vi.stubGlobal("FormData", originalFormData)
    vi.unstubAllGlobals()
  }
})
