import Link from "next/link";
import {
  ArrowRight,
  Captions,
  Check,
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

        <video
          className="block aspect-[427/240] h-auto w-full bg-black"
          width={854}
          height={480}
          src="/demo.mp4"
          aria-label="Lingo Palm product demo"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    </div>
  );
}
