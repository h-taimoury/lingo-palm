import { ApiError } from "@/lib/api/errors";

const delays = [3000, 8000, 15000];

export class ScrapeRetriesExhausted extends Error {
  constructor(readonly lastError: ApiError) {
    super(lastError.message);
    this.name = "ScrapeRetriesExhausted";
  }
}

export function isWordNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 &&
    error.data !== null && typeof error.data === "object" &&
    "code" in error.data && error.data.code === "word_not_found";
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

export async function withScrapeRetry<T>(
  attempt: () => Promise<T>,
  signal: AbortSignal,
  log: (message: string) => void,
): Promise<T | undefined> {
  for (let retry = 0; !signal.aborted; retry++) {
    try {
      // Do not abort an in-flight write: it may still finish on the server.
      return await attempt();
    } catch (error) {
      if (signal.aborted) return;
      const data = error instanceof ApiError ? error.data : null;
      // Only retry confirmed scraper failures, not ambiguous lost responses.
      const safe = error instanceof ApiError && error.status === 502 &&
        data !== null && typeof data === "object" && "retryable" in data && data.retryable === true;
      if (!safe) throw error;
      if (retry >= delays.length) throw new ScrapeRetriesExhausted(error);
      log(`${error.message} Retrying in ${delays[retry] / 1000} seconds (${retry + 1}/${delays.length}).`);
      await wait(delays[retry], signal);
    }
  }
}
