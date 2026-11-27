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

  it.each(["development", "production"] as const)("prefers authorized playback in %s, including for admin previews", (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    const playback_url = "/api/courses/sections/17/video/";
    expect(getSectionVideoUrl({ ...section, playback_url })).toBe(playback_url);
  });

  it("proxies moved sample videos through Django during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getSectionVideoUrl({
      ...section,
      local_video_url: "http://localhost:3000/sample-courses/Finding-Nemo/section1/1.mp4",
    })).toBe("/api/backend-media/sample-courses/Finding-Nemo/section1/1.mp4");
  });
});
