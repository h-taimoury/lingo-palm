export const publicEnv = {
  enableScraper: process.env.NEXT_PUBLIC_ENABLE_SCRAPER === "true",
} as const
