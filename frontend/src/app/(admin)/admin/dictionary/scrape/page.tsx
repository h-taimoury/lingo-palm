import { notFound } from "next/navigation"
import Link from "next/link"
import { ScraperForm } from "@/components/admin/scraper/ScraperForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { publicEnv } from "@/lib/env"
export default function Page() { if (!publicEnv.enableScraper) notFound(); return <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6"><Link href="/admin/dictionary" className="text-sm text-muted-foreground hover:text-foreground">← Dictionary</Link><div className="mt-5"><PageHeader title="Dictionary scraper" description="Development-only workflow backed by /api/scraper/. Scraped rows are saved immediately, then returned for staff review." /></div><div className="mt-8"><ScraperForm /></div></div> }
