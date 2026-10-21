import type { Sense } from "@/types/api/dictionary";
import type { PaginatedResponse } from "@/types/api/common";

const queuePath = "/api/dictionary/senses/?needs_translation=true";

export async function loadUntranslatedSenses(get: (path: string) => Promise<PaginatedResponse<Sense>>) {
  const senses = new Map<number, Sense>();
  const visited = new Set<string>();
  let path: string | null = queuePath;
  while (path) {
    if (visited.has(path)) throw new Error("The translation queue returned a repeated page. Please try again.");
    visited.add(path);
    const page: PaginatedResponse<Sense> = await get(path);
    for (const sense of page.results) senses.set(sense.id, sense);
    // Use only the query from pagination links, keeping requests on our API.
    path = page.next ? `/api/dictionary/senses/${new URL(page.next, "http://localhost").search}` : null;
  }
  return [...senses.values()].filter(sense => !sense.translation?.trim());
}

export function randomTranslationBatch(senses: Sense[], random = Math.random) {
  const shuffled = [...senses];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 25).map(sense => ({
    id: sense.id,
    word: sense.entry.word,
    part_of_speech: sense.entry.part_of_speech,
    definition: sense.definition,
    lex_unit: sense.lex_unit,
    translation: "",
  }));
}

export function parseTranslations(text: string): { id: number; translation: string }[] {
  let data: unknown;
  try { data = JSON.parse(text.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, "$1")); }
  catch { throw new Error("Paste a valid JSON array of senses."); }
  if (!Array.isArray(data) || data.length > 25 || !data.length) throw new Error("Provide a JSON array containing 1 to 25 senses.");
  const ids = new Set<number>();
  const translations: { id: number; translation: string }[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object" || !Number.isSafeInteger(row.id) || row.id <= 0) throw new Error("Every sense must have a positive integer id.");
    if (ids.has(row.id)) throw new Error(`Duplicate sense id: ${row.id}.`);
    ids.add(row.id);
    if (row.translation == null || row.translation === "") continue;
    if (typeof row.translation !== "string") throw new Error(`Translation for sense ${row.id} must be text.`);
    if (row.translation.trim()) translations.push({ id: row.id, translation: row.translation.trim() });
  }
  if (!translations.length) throw new Error("No translations to save. Fill in at least one translation.");
  return translations;
}
