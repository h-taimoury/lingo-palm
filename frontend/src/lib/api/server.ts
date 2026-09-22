import "server-only";

import { cookies, headers as requestHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { createApiError, createNetworkError } from "@/lib/api/errors";
import { parseResponse } from "@/lib/api/response";
import { buildDjangoUrl } from "@/lib/env.server";

export type DjangoServerFetchOptions = RequestInit & {
  returnTo?: string;
  refreshOnUnauthorized?: boolean;
};

export async function getCurrentRequestPath(fallback = "/") {
  const headers = await requestHeaders();
  return headers.get("x-lingopalm-path") || fallback;
}

export async function djangoServerFetch<T>(
  path: string,
  options: DjangoServerFetchOptions = {},
): Promise<T> {
  const {
    headers, // No part of our codebase that uses djangoServerFetch sets this 'headers' option, so we can remove it and use new Headers(), but I didn't remove it because otherwise, if someone does set it, it would be over-ridden and that would be confusing. So I left it in, but it's not used so far anywhere in the codebase.
    returnTo,
    refreshOnUnauthorized = true,
    ...fetchOptions
  } = options;

  const cookieStore = await cookies();
  const outgoingHeaders = new Headers(headers);
  const cookieHeader = cookieStore.toString();
  if (cookieHeader) outgoingHeaders.set("Cookie", cookieHeader);
  if (!outgoingHeaders.has("Accept"))
    outgoingHeaders.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(buildDjangoUrl(path), {
      ...fetchOptions,
      cache: fetchOptions.cache ?? "no-store",
      headers: outgoingHeaders,
    });
  } catch (error) {
    throw createNetworkError(error);
  }

  if (response.status === 401 && refreshOnUnauthorized) {
    const target = returnTo ?? (await getCurrentRequestPath("/"));
    redirect(`/auth/refresh?returnTo=${encodeURIComponent(target)}`);
  }

  const data = await parseResponse(response);
  if (!response.ok) throw createApiError(response.status, data);
  return data as T;
}
