type SectionVideoUrls = {
  local_video_url: string;
  hosted_video_url: string;
  playback_url?: string;
};

// Next.js sets NODE_ENV for both server code and browser bundles.
// An empty selected URL stays empty: never fall back to the other environment.
export function getSectionVideoUrl(section: SectionVideoUrls): string {
  if (section.playback_url) return section.playback_url;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\/sample-courses\//.test(section.local_video_url)) {
    return section.local_video_url.replace(/^https?:\/\/[^/]+/, "/api/backend-media");
  }
  return process.env.NODE_ENV === "production"
    ? section.hosted_video_url
    : section.local_video_url;
}
