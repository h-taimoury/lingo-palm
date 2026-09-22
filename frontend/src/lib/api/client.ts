import { getCsrfToken, requiresCsrf } from "@/lib/api/csrf";
import { parseResponse } from "@/lib/api/response";
import { buildDjangoBrowserUrl } from "@/lib/env.client";
import {
  ApiError,
  SessionExpiredError,
  createApiError,
  createNetworkError,
} from "@/lib/api/errors";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  retryOnUnauthorized?: boolean;
};

function serializeBody(body: unknown): string | FormData | undefined {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

function buildHeaders(method: string, body: unknown, incoming?: HeadersInit) {
  const headers = new Headers(incoming);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  if (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresCsrf(method) && !headers.has("X-CSRFToken")) {
    const token = getCsrfToken();
    if (token) headers.set("X-CSRFToken", token);
  }
  return headers;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const returnTo = `${window.location.pathname}${window.location.search}`;
  const target = new URL("/login", window.location.origin);
  if (window.location.pathname !== "/login")
    target.searchParams.set("returnTo", returnTo);
  window.location.assign(target.toString());
}

let refreshPromise: Promise<void> | null = null;

async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const method = "POST";
    try {
      const response = await fetch(
        buildDjangoBrowserUrl("/api/users/refresh/"),
        {
          method,
          credentials: "include",
          cache: "no-store",
          headers: buildHeaders(method, {}),
          body: JSON.stringify({}),
        },
      );
      const data = await parseResponse(response);
      if (!response.ok) throw createApiError(response.status, data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw createNetworkError(error);
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers: incomingHeaders,
    retryOnUnauthorized = true,
    ...fetchOptions
  } = options;

  const normalizedMethod = method.toUpperCase();
  let response: Response;
  try {
    response = await fetch(buildDjangoBrowserUrl(path), {
      ...fetchOptions,
      method: normalizedMethod,
      credentials: "include",
      cache: fetchOptions.cache ?? "no-store",
      headers: buildHeaders(normalizedMethod, body, incomingHeaders),
      body: serializeBody(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw createNetworkError(error);
  }

  if (response.status === 401 && retryOnUnauthorized) {
    try {
      await refreshSession();
    } catch (error) {
      redirectToLogin();
      throw new SessionExpiredError({ cause: error });
    }
    return request<T>(path, { ...options, retryOnUnauthorized: false });
  }
  if (response.status === 401) redirectToLogin();

  const data = await parseResponse(response);
  if (!response.ok) {
    const error = createApiError(response.status, data);
    throw error;
  }
  return data as T;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<TResponse>(path, { ...options, method: "POST", body });
  },
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<TResponse>(path, { ...options, method: "PUT", body });
  },
  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<TResponse>(path, { ...options, method: "PATCH", body });
  },
  delete<TResponse = void, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<TResponse>(path, { ...options, method: "DELETE", body });
  },
} as const;
