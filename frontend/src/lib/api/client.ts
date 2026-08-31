import { getCsrfToken, requiresCsrf } from "@/lib/api/csrf"
import {
  ApiError,
  SessionExpiredError,
  createApiError,
  createNetworkError,
} from "@/lib/api/errors"

export type ApiRequestOptions = Omit<RequestInit, "body" | "method"> & {
  method?: string
  body?: unknown
  retryOnUnauthorized?: boolean
  _hasRetried?: boolean
}

let refreshPromise: Promise<void> | null = null

function gatewayUrl(path: string) {
  if (/^https?:\/\//iu.test(path)) return path

  const queryIndex = path.indexOf("?")
  const pathname = queryIndex >= 0 ? path.slice(0, queryIndex) : path
  const query = queryIndex >= 0 ? path.slice(queryIndex) : ""
  const withoutApi = pathname
    .replace(/^\/?api\//u, "")
    .replace(/^\/+|\/+$/gu, "")

  return `/api/backend/${withoutApi}/${query}`
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined
  if (
    isFormData(body) ||
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body as BodyInit
  }
  return JSON.stringify(body)
}

function buildHeaders(method: string, body: unknown, incoming?: HeadersInit) {
  const headers = new Headers(incoming)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")

  if (body !== undefined && body !== null && !isFormData(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (requiresCsrf(method) && !headers.has("X-CSRFToken")) {
    const token = getCsrfToken()
    if (token) headers.set("X-CSRFToken", token)
  }
  return headers
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
  const text = await response.text()
  return text || null
}

function redirectToLogin() {
  if (typeof window === "undefined") return
  const returnTo = `${window.location.pathname}${window.location.search}`
  const target = new URL("/login", window.location.origin)
  if (returnTo !== "/login") target.searchParams.set("returnTo", returnTo)
  window.location.assign(target.toString())
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const method = "POST"
      try {
        const response = await fetch(gatewayUrl("/api/users/refresh/"), {
          method,
          credentials: "include",
          cache: "no-store",
          headers: buildHeaders(method, {}),
          body: JSON.stringify({}),
        })
        const data = await parseResponse(response)
        if (!response.ok) throw createApiError(response.status, data)
      } catch (error) {
        if (error instanceof ApiError) throw error
        throw createNetworkError(error)
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers: incomingHeaders,
    retryOnUnauthorized = !path.includes("/users/login/") && !path.includes("/users/refresh/"),
    _hasRetried = false,
    ...fetchOptions
  } = options

  const normalizedMethod = method.toUpperCase()
  let response: Response
  try {
    response = await fetch(gatewayUrl(path), {
      ...fetchOptions,
      method: normalizedMethod,
      credentials: "include",
      cache: fetchOptions.cache ?? "no-store",
      headers: buildHeaders(normalizedMethod, body, incomingHeaders),
      body: serializeBody(body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw createNetworkError(error)
  }

  if (response.status === 401 && retryOnUnauthorized && !_hasRetried) {
    try {
      await refreshSession()
    } catch (error) {
      redirectToLogin()
      throw new SessionExpiredError({ cause: error })
    }
    return request<T>(path, { ...options, _hasRetried: true })
  }

  const data = await parseResponse(response)
  if (!response.ok) {
    const error = createApiError(response.status, data)
    if (response.status === 401) redirectToLogin()
    throw error
  }
  return data as T
}

export const apiClient = {
  request,
  get<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "GET" })
  },
  post<TResponse, TBody = unknown>(path: string, body?: TBody, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<TResponse>(path, { ...options, method: "POST", body })
  },
  put<TResponse, TBody = unknown>(path: string, body?: TBody, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<TResponse>(path, { ...options, method: "PUT", body })
  },
  patch<TResponse, TBody = unknown>(path: string, body?: TBody, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<TResponse>(path, { ...options, method: "PATCH", body })
  },
  delete<TResponse = void, TBody = unknown>(path: string, body?: TBody, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<TResponse>(path, { ...options, method: "DELETE", body })
  },
} as const
