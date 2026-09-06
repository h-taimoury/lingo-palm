import Link from "next/link";
import {
  ArrowRight,
  BookmarkCheck,
  Captions,
  Check,
  Play,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const benefits = ["Authentic video", "Curated meanings", "Personal review"];

export function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute -left-32 top-16 -z-10 size-80 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-40 bottom-0 -z-10 size-96 rounded-full bg-accent/80 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-12">
        <div className="max-w-2xl text-center lg:text-left">
          <Badge
            variant="secondary"
            className="h-7 border border-primary/15 px-3 text-primary"
          >
            <Captions data-icon="inline-start" />
            Context-first English learning
          </Badge>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.035em]  lg:text-5xl lg:leading-[1.04]">
            Learn the English you hear in the scenes you love.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl lg:mx-0">
            Watch authentic videos, explore the exact meaning behind highlighted
            words, and turn each discovery into lasting vocabulary.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href={isAuthenticated ? "/courses" : "/register"}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 px-5 text-base shadow-lg shadow-primary/20",
              )}
            >
              {isAuthenticated ? "Continue learning" : "Start learning free"}
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
            <Link
              href={isAuthenticated ? "/my-vocabulary" : "/login"}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 px-5 text-base",
              )}
            >
              {isAuthenticated
                ? "Open my vocabulary"
                : "I already have an account"}
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-1.5">
                <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
      <div
        className="absolute -inset-3 -z-10 rounded-[2rem] bg-primary/10 blur-xl"
        aria-hidden="true"
      />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-foreground/10">
        <div className="flex h-10 items-center gap-1.5 border-b bg-muted/60 px-4">
          <span className="size-2.5 rounded-full bg-primary/70" />
          <span className="size-2.5 rounded-full bg-primary/35" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="mx-auto h-5 w-2/5 rounded-md bg-background/80" />
          <span className="w-7" />
        </div>

        <div className="relative aspect-video overflow-hidden bg-[#17120f]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(234,88,12,0.26),transparent_30%),linear-gradient(145deg,#2e221c_0%,#17120f_48%,#0f0c0a_100%)]" />
          <div className="absolute left-[14%] top-[18%] h-[52%] w-[32%] rounded-[45%_45%_20%_20%] bg-gradient-to-b from-orange-100/20 to-orange-950/20 blur-[1px]" />
          <div className="absolute right-[11%] top-[27%] h-[38%] w-[28%] rounded-[40%_45%_18%_18%] bg-gradient-to-b from-orange-200/15 to-orange-950/30 blur-[1px]" />

          <span
            className="absolute left-1/2 top-[42%] grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md"
            aria-hidden="true"
          >
            <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
          </span>

          <div className="absolute inset-x-4 bottom-12 text-center sm:inset-x-10">
            <p className="inline rounded-lg bg-black/65 px-2 py-1 text-sm font-medium leading-7 text-white shadow-sm sm:text-lg">
              I finally{" "}
              <span className="rounded bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground">
                figured it out
              </span>
              .
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex h-10 items-center gap-3 bg-gradient-to-t from-black/90 to-black/30 px-4 text-white/90">
            <Play className="size-4 fill-current" aria-hidden="true" />
            <Volume2 className="size-4" aria-hidden="true" />
            <div className="relative h-1 flex-1 rounded-full bg-white/25">
              <span className="absolute inset-y-0 left-0 w-[42%] rounded-full bg-primary" />
              <span className="absolute left-[42%] top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-primary" />
            </div>
            <span className="text-[0.65rem] tabular-nums">02:14 / 05:08</span>
          </div>
        </div>
      </div>

      <div className="relative -mt-7 ml-auto mr-3 w-[84%] rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur sm:-mt-10 sm:mr-8 sm:w-[68%] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BookmarkCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="font-semibold">figure out</p>
              <span className="text-xs italic text-muted-foreground">
                phrasal verb
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              to understand or solve something after thinking about it
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
