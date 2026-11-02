"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function VocabularyFilter({ value }: { value: "all" | "review" | "stable" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Filter vocabulary by review status"
      aria-busy={pending}
      disabled={pending}
      value={value}
      onChange={(event) => {
        const filter = event.target.value;
        startTransition(() => {
          router.push(filter === "all" ? "/my-vocabulary" : `/my-vocabulary?filter=${filter}`, { scroll: false });
        });
      }}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="all">All</option>
      <option value="review">Needs review</option>
      <option value="stable">Review off</option>
    </select>
  );
}
