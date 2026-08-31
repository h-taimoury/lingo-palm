export function parseVttTimestamp(value: string): number {
  const normalized = value.trim()
  const parts = normalized.split(":")

  if (parts.length !== 2 && parts.length !== 3) {
    throw new Error(`Invalid WebVTT timestamp: ${value}`)
  }

  const secondsPart = parts.at(-1)
  const minutesPart = parts.at(-2)

  if (!secondsPart || !minutesPart) {
    throw new Error(`Invalid WebVTT timestamp: ${value}`)
  }

  const seconds = Number(secondsPart.replace(",", "."))
  const minutes = Number(minutesPart)
  const hours = parts.length === 3 ? Number(parts[0]) : 0

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    throw new Error(`Invalid WebVTT timestamp: ${value}`)
  }

  return hours * 3600 + minutes * 60 + seconds
}
