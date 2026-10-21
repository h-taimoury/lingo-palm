import { afterEach, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { isWordNotFound, withScrapeRetry } from "./scrapeRetry";

const failure = () => new ApiError({ message: "Load failed", status: 502, data: { retryable: true } });
afterEach(() => vi.useRealTimers());

it("recognizes a confirmed missing Longman word without retrying it", async () => {
  const error = new ApiError({ message: "No entries", status: 404, data: { code: "word_not_found" } });
  const attempt = vi.fn().mockRejectedValue(error);
  await expect(withScrapeRetry(attempt, new AbortController().signal, vi.fn())).rejects.toSatisfy(isWordNotFound);
  expect(attempt).toHaveBeenCalledTimes(1);
});

it.each([
  new ApiError({ message: "Missing endpoint", status: 404 }),
  new ApiError({ message: "Missing section", status: 404, data: { detail: "Not found" } }),
  new ApiError({ message: "Proxy failure", status: 502, data: { code: "word_not_found" } }),
  new ApiError({ message: "Network failure" }),
  new Error("No dictionary entries found"),
])("does not skip other failures as missing words: %s", (error) => {
  expect(isWordNotFound(error)).toBe(false);
});

it("backs off three times then reports the failure", async () => {
  vi.useFakeTimers();
  const attempt = vi.fn().mockRejectedValue(failure());
  const log = vi.fn();
  const result = withScrapeRetry(attempt, new AbortController().signal, log);
  const assertion = expect(result).rejects.toThrow("Load failed");
  await vi.advanceTimersByTimeAsync(3000);
  expect(attempt).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(8000);
  expect(attempt).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(15000);
  await assertion;
  expect(attempt).toHaveBeenCalledTimes(4);
  expect(log).toHaveBeenCalledTimes(3);
});

it("stops a pending delay without starting another request", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const attempt = vi.fn().mockRejectedValue(failure());
  const result = withScrapeRetry(attempt, controller.signal, vi.fn());
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  expect(await result).toBeUndefined();
  await vi.runAllTimersAsync();
  expect(attempt).toHaveBeenCalledTimes(1);
});

it("keeps the result of a request that finishes after stop", async () => {
  const controller = new AbortController();
  let finish!: (value: string) => void;
  const result = withScrapeRetry(() => new Promise<string>((resolve) => { finish = resolve; }), controller.signal, vi.fn());
  controller.abort();
  finish("saved");
  expect(await result).toBe("saved");
});

it("returns a successful retry result", async () => {
  vi.useFakeTimers();
  const attempt = vi.fn().mockRejectedValueOnce(failure()).mockResolvedValue("saved");
  const result = withScrapeRetry(attempt, new AbortController().signal, vi.fn());
  await vi.advanceTimersByTimeAsync(3000);
  expect(await result).toBe("saved");
  expect(attempt).toHaveBeenCalledTimes(2);
});

it.each([404, 409, 500, 502, null])("does not retry unconfirmed failures (%s)", async (status) => {
  const attempt = vi.fn().mockRejectedValue(new ApiError({ message: "Failed", status }));
  await expect(withScrapeRetry(attempt, new AbortController().signal, vi.fn())).rejects.toThrow("Failed");
  expect(attempt).toHaveBeenCalledTimes(1);
});
