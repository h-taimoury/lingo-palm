import { afterEach, describe, expect, it, vi } from "vitest";
import { getSectionVideoUrl } from "./video";

afterEach(() => vi.unstubAllEnvs());

describe("section video selection", () => {
  const section = {
    local_video_url: "http://localhost:3000/videos/lesson.mp4",
    hosted_video_url: "https://cdn.example.com/lesson.mp4",
  };

  it.each(["development", "production"] as const)("uses only the selected URL in %s", (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    const field = environment === "production" ? "hosted_video_url" : "local_video_url";
    expect(getSectionVideoUrl(section)).toBe(section[field]);
    expect(getSectionVideoUrl({ ...section, [field]: "" })).toBe("");
  });
});
