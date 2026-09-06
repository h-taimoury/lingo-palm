import {
  BookOpenCheck,
  Brain,
  Captions,
  MousePointerClick,
  Sparkles,
  Target,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Target,
    title: "Learn exact meanings",
    description: "Save the dictionary sense used in the scene—not every unrelated meaning of the same word.",
  },
  {
    icon: Captions,
    title: "Curated interactive subtitles",
    description: "Useful word occurrences are deliberately mapped so every learning interaction has a clear purpose.",
  },
  {
    icon: MousePointerClick,
    title: "Stay inside the story",
    description: "Open a meaning from the subtitle and return to the moment without losing your place in the video.",
  },
  {
    icon: Brain,
    title: "Review what matters to you",
    description: "Your vocabulary collection reflects the meanings you chose and gives you a focused review queue.",
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Built for meaningful progress</p>
            <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Less guessing. More language that makes sense.
            </h2>
          </div>
          <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg lg:justify-self-end">
            Every part of LingoPalm is designed around context, so the vocabulary you collect stays connected to something memorable.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Card className="relative overflow-hidden bg-primary py-0 text-primary-foreground md:col-span-2">
            <CardContent className="flex h-full min-h-72 flex-col justify-between p-7 sm:p-9">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/75">
                <BookOpenCheck className="size-4" aria-hidden="true" />
                Context is the learning unit
              </div>
              <div className="max-w-xl">
                <Sparkles className="mb-5 size-9 text-primary-foreground/80" aria-hidden="true" />
                <h3 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  One word can mean many things. You learn the one the speaker meant.
                </h3>
                <p className="mt-4 max-w-lg text-base leading-7 text-primary-foreground/75">
                  LingoPalm ties each subtitle occurrence to a precise dictionary sense, keeping your learning clear and specific.
                </p>
              </div>
            </CardContent>
          </Card>

          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="py-0 transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 leading-6 text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
