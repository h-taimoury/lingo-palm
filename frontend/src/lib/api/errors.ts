export type ApiFieldErrors = Record<string, string[]>
export type ApiErrorData = Record<string, unknown> | unknown[] | string | null

export class ApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: ApiFieldErrors
  readonly data: ApiErrorData

  constructor(options: {
    message: string
    status?: number | null
    fieldErrors?: ApiFieldErrors
    data?: ApiErrorData
    cause?: unknown
  }) {
    super(options.message, { cause: options.cause })
    this.name = "ApiError"
    this.status = options.status ?? null
    this.fieldErrors = options.fieldErrors ?? {}
    this.data = options.data ?? null
  }
}

export class SessionExpiredError extends ApiError {
  constructor(options?: { data?: ApiErrorData; cause?: unknown }) {
    super({
      message: "Your session has expired. Please sign in again.",
      status: 401,
      data: options?.data,
      cause: options?.cause,
    })
    this.name = "SessionExpiredError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringList(value: unknown): string[] | null {
  if (typeof value === "string") return [value]
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value as string[]
  }
  return null
}

export function extractFieldErrors(data: unknown): ApiFieldErrors {
  if (!isRecord(data)) return {}

  const result: ApiFieldErrors = {}
  for (const [key, value] of Object.entries(data)) {
    if (["detail", "message", "errors"].includes(key)) continue
    const direct = stringList(value)
    if (direct) {
      result[key] = direct
      continue
    }

    if (isRecord(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const nested = stringList(nestedValue)
        if (nested) result[`${key}.${nestedKey}`] = nested
      }
    }
  }
  return result
}

function extractMessage(data: unknown, fallback: string) {
  if (typeof data === "string" && data.trim()) return data
  if (isRecord(data)) {
    for (const key of ["detail", "message"] as const) {
      const value = data[key]
      if (typeof value === "string" && value.trim()) return value
    }

    const fieldErrors = extractFieldErrors(data)
    const first = Object.values(fieldErrors)[0]?.[0]
    if (first) return first
  }
  return fallback
}

export function createApiError(status: number, data: unknown, fallback?: string) {
  if (status === 401) {
    return new SessionExpiredError({ data: data as ApiErrorData })
  }

  const fallbackByStatus: Record<number, string> = {
    400: "Please check the form and try again.",
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "This action conflicts with existing data.",
    422: "The submitted data could not be processed.",
    500: "The server encountered an unexpected error.",
    502: "A required upstream service is unavailable.",
  }

  return new ApiError({
    status,
    message: extractMessage(
      data,
      fallback ?? fallbackByStatus[status] ?? `Request failed (${status}).`,
    ),
    fieldErrors: extractFieldErrors(data),
    data: data as ApiErrorData,
  })
}

export function createNetworkError(cause: unknown) {
  return new ApiError({
    message: "Unable to reach the server. Check your connection and try again.",
    status: null,
    cause,
  })
}

export function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}
