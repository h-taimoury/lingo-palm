import { parseVtt } from "@/lib/subtitles/parseVtt"
import type { ParsedSubtitle } from "@/types/subtitles"

export async function loadVtt(
  url: string,
  signal?: AbortSignal,
): Promise<ParsedSubtitle> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  })

  if (!response.ok) {
    throw new Error(
      `Unable to load subtitles (${response.status} ${response.statusText}).`,
    )
  }

  const text = await response.text()
  return parseVtt(text)
}
