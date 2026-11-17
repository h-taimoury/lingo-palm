import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { formatLearningDate, LearningChart, learningBuckets } from "./LearningChart";

const days = Array.from({ length: 90 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 8, index + 1)).toISOString().slice(0, 10),
  count: index % 3,
}));

it("keeps daily dates and zero days without shifting them to the local time zone", () => {
  expect(learningBuckets(days.slice(0, 7), false)).toEqual(days.slice(0, 7).map((day) => ({
    start: day.date, end: day.date, count: day.count,
  })));
  expect(formatLearningDate("2026-01-01")).toBe("Jan 1");
});

it("groups 90 days into weeks and preserves the final partial week and total", () => {
  const buckets = learningBuckets(days, true);
  expect(buckets).toHaveLength(13);
  expect(buckets[0]).toEqual({ start: "2026-09-01", end: "2026-09-07", count: 6 });
  expect(buckets.at(-1)?.end).toBe(days.at(-1)?.date);
  expect(buckets.at(-1)?.count).toBe(days.slice(84).reduce((sum, day) => sum + day.count, 0));
  expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(days.reduce((sum, day) => sum + day.count, 0));
});

it("renders zero activity with accessible counts and a chart data table", () => {
  const markup = renderToStaticMarkup(<LearningChart days={[{ date: "2026-11-18", count: 0 }]} weekly={false} />);
  expect(markup).toContain("Nov 18: 0 senses learned");
  expect(markup).toContain("View chart data");
  expect(markup).not.toContain("NaN");
  expect(markup).not.toContain("Infinity");
});
