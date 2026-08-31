"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <main className="grid min-h-dvh place-items-center px-6"><div className="max-w-lg text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="mt-3 text-muted-foreground">The page could not be loaded. Retry the request; if it keeps happening, check the Django API.</p><Button className="mt-6" onClick={reset}>Try again</Button></div></main>
}
