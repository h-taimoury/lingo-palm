export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null

  const prefix = `${encodeURIComponent(name)}=`
  for (const chunk of document.cookie.split(";")) {
    const cookie = chunk.trim()
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length))
    }
  }
  return null
}

export function getCsrfToken() {
  return getCookie("csrftoken")
}

export function requiresCsrf(method: string) {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase())
}
