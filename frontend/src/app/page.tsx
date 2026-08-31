import Link from "next/link"
import { ArrowRight, Captions, Languages, PlayCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">LingoPalm</Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Sign in</Link>
            <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>Create account</Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <Badge variant="secondary">Context-first English learning</Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Learn the meaning that is actually being used.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Watch authentic videos with curated interactive subtitles, learn exact dictionary senses, and keep a personal review queue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
                Start learning <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>I already have an account</Link>
            </div>
          </div>

          <Card className="overflow-hidden shadow-lg">
            <CardContent className="grid gap-0 p-0">
              <Feature icon={PlayCircle} title="Authentic video" text="Progressive files, local development media, and HLS streams use the same custom player." />
              <Feature icon={Captions} title="Curated subtitles" text="Only deliberately mapped subtitle occurrences become learning interactions." />
              <Feature icon={Languages} title="Sense-level vocabulary" text="Learning is stored against an exact dictionary sense rather than an ambiguous whole word." />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

function Feature({ icon: Icon, title, text }: { icon: typeof PlayCircle; title: string; text: string }) {
  return (
    <div className="flex gap-4 border-b p-6 last:border-b-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon className="size-5" /></span>
      <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>
    </div>
  )
}
