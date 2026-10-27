type SectionVideoUrls = {
  local_video_url: string;
  hosted_video_url: string;
};

// Next.js sets NODE_ENV for both server code and browser bundles.
// An empty selected URL stays empty: never fall back to the other environment.
export function getSectionVideoUrl(section: SectionVideoUrls): string {
  return process.env.NODE_ENV === "production"
    ? section.hosted_video_url
    : section.local_video_url;
}
