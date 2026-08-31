export function parsePositivePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw ?? "1")
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function withPage(path: string, page: number, params?: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  if (page > 1) search.set("page", String(page))
  for (const [key, value] of Object.entries(params ?? {})) if (value) search.set(key, value)
  const query = search.toString()
  return query ? `${path}?${query}` : path
}
