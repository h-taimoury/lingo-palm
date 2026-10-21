import { describe, expect, it, vi } from "vitest";
import type { Sense } from "@/types/api/dictionary";
import { loadUntranslatedSenses, parseTranslations, randomTranslationBatch } from "./bulkTranslation";

const sense = (id: number) => ({ id, entry: { word: `word-${id}`, part_of_speech: "noun" }, definition: `meaning-${id}`, lex_unit: null, translation: null }) as Sense;

describe("bulk translation export", () => {
  it("loads all pages, deduplicates senses, and keeps pagination on the existing endpoint", async () => {
    const get = vi.fn().mockResolvedValueOnce({ results: [sense(1)], next: "http://backend/api/dictionary/senses/?needs_translation=true&page=2" }).mockResolvedValueOnce({ results: [sense(1), sense(2)], next: null });
    expect((await loadUntranslatedSenses(get)).map(row => row.id)).toEqual([1, 2]);
    expect(get.mock.calls[1][0]).toBe("/api/dictionary/senses/?needs_translation=true&page=2");
  });
  it("samples across the whole queue without duplicates or changing its order", () => {
    const all = Array.from({ length: 60 }, (_, i) => sense(i + 1));
    const batch = randomTranslationBatch(all, () => 0);
    expect(batch).toHaveLength(25);
    expect(new Set(batch.map(row => row.id)).size).toBe(25);
    expect(batch.some(row => row.id > 25)).toBe(true);
    expect(all[0].id).toBe(1);
    expect(batch[0]).toHaveProperty("translation", "");
    expect(randomTranslationBatch(all.slice(0, 2))).toHaveLength(2);
    expect(randomTranslationBatch([])).toEqual([]);
  });
});

describe("translation import validation", () => {
  it("accepts AI code fences and skips missing, null, or blank translations", () => {
    expect(parseTranslations('```json\n[{"id":1,"translation":" بادام "},{"id":2},{"id":3,"translation":null},{"id":4,"translation":" "}]\n```')).toEqual([{ id: 1, translation: "بادام" }]);
  });
  it.each(['{}', 'bad json', '[{"id":1,"translation":42}]', '[{"id":"1","translation":"x"}]', '[{"id":1,"translation":"x"},{"id":1,"translation":"y"}]', '[{"id":1,"translation":""}]', JSON.stringify(Array.from({length:26}, (_, i) => ({id:i+1,translation:"x"})))])("rejects invalid imports before writing: %s", input => {
    expect(() => parseTranslations(input)).toThrow();
  });
});
