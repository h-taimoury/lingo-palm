export type MediaSourceKind = "hls" | "progressive"

export function getMediaSourceKind(source: string): MediaSourceKind {
  const pathname = getSourcePathname(source)
  return pathname.toLowerCase().endsWith(".m3u8") ? "hls" : "progressive"
}

export function getSourcePathname(source: string): string {
  try {
    return new URL(source, "http://lingopalm.local").pathname
  } catch {
    return source.split(/[?#]/u, 1)[0] ?? source
  }
}
