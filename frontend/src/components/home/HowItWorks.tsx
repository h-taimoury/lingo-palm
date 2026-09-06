import { Captions, Clapperboard, Layers3 } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Clapperboard,
    title: "Choose a course",
    description: "Pick a video course that matches your interests and learn from language used in a real context.",
  },
  {
    number: "02",
    icon: Captions,
    title: "Watch and explore",
    description: "Select a highlighted subtitle word to see the exact dictionary sense being used in that moment.",
  },
  {
    number: "03",
    icon: Layers3,
    title: "Save and review",
    description: "Build a personal sense-level vocabulary list, then strengthen it with focused review sessions.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/35 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From watching to remembering in three simple steps
          </h2>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            LingoPalm connects the scene, the subtitle occurrence, and the precise meaning you want to learn.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <li key={number} className="group relative overflow-hidden rounded-2xl border bg-background p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md sm:p-7">
              <span className="absolute right-5 top-3 text-6xl font-bold tracking-tighter text-primary/[0.07]" aria-hidden="true">
                {number}
              </span>
              <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
