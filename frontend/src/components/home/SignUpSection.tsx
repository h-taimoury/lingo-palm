import Link from "next/link"
import { ArrowRight, PlayCircle } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { User } from "@/types/api/users"

export function SignUpSection({ user }: { user: User | null }) {
  const learnerName = user?.first_name || user?.full_name || "there"

  return (
    <section className="px-4 pb-20 pt-4 sm:px-6 sm:pb-28 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#211713] px-6 py-14 text-center text-orange-50 shadow-xl sm:px-12 sm:py-20">
        <div className="absolute -left-20 -top-28 size-72 rounded-full bg-primary/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-36 -right-16 size-80 rounded-full bg-orange-400/15 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-3xl">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-black/20">
            <PlayCircle className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            {user
              ? `Welcome back, ${learnerName}. Ready for another scene?`
              : "Your next favorite scene could teach you something."}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-orange-100/70 sm:text-lg">
            {user
              ? "Continue your course or revisit the exact meanings you have already collected."
              : "Create an account and start building English vocabulary from the language people actually use."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={user ? "/courses" : "/register"} className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}>
              {user ? "Continue learning" : "Create free account"}
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
            <Link
              href={user ? "/review/flashcard" : "/login"}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 border-white/15 bg-white/5 px-6 text-base text-orange-50 hover:bg-white/10 hover:text-white",
              )}
            >
              {user ? "Review vocabulary" : "Sign in"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
