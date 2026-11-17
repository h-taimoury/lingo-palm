import { expect, it } from "vitest"
import { getMappingTranslation } from "./mappings"

it("prefers the mapping translation and only falls back for a single sense", () => {
  const sense = { short_translation: " fallback " }
  const senses = [sense, { short_translation: "other" }]
  expect(getMappingTranslation({ translation: " override ", senses })).toBe("override")
  expect(getMappingTranslation({ translation: null, senses })).toBe("")
  expect(getMappingTranslation({ translation: "", senses: [sense] })).toBe("fallback")
  expect(getMappingTranslation({ translation: "  ", senses: [sense] })).toBe("fallback")
})
