export function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePositivePage(value: string | string[] | undefined) {
  const raw = firstSearchParam(value);
  const parsed = Number(raw ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {}))
    if (value !== undefined && value !== "")
      searchParams.set(key, String(value));
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}
