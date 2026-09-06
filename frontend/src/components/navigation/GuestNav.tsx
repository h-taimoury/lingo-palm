import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GuestNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="LingoPalm home"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-bold tracking-tight text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:-rotate-3">
            LP
          </span>
          <span className="font-semibold tracking-tight">LingoPalm</span>
        </Link>

        <nav
          aria-label="Homepage"
          className="mx-auto hidden items-center gap-10 md:flex"
        >
          <a
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            href="#how-it-works"
          >
            How it works
          </a>
          <a
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            href="#features"
          >
            Features
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9 px-3",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-9 px-3.5 shadow-sm shadow-primary/20",
            )}
          >
            <span>Create account</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
