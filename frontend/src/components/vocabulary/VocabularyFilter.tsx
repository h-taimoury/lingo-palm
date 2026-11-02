"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function VocabularyFilter({ value, source }: { value: "all" | "review" | "stable"; source: "all" | "known" | "here" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function changeFilter(filter: string, learningSource: string) {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (learningSource !== "all") params.set("source", learningSource);
    const query = params.toString();
    startTransition(() => {
      router.push(`/my-vocabulary${query ? `?${query}` : ""}`, { scroll: false });
    });
  }
  return (
    <div className="flex flex-wrap items-center gap-x-20 gap-y-3">
    <label className="flex items-center gap-3 whitespace-nowrap text-sm font-medium">
      Review status
    <span className="relative inline-grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 pl-2 pr-6">Needs review</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 pl-2 pr-6">Already knew</span>
    <select
      aria-label="Filter vocabulary by review status"
      aria-busy={pending}
      disabled={pending}
      value={value}
      onChange={(event) => changeFilter(event.target.value, source)}
      className="col-start-1 row-start-1 h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-background pl-2 pr-6 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="all">All</option>
      <option value="review">Needs review</option>
      <option value="stable">Review off</option>
    </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2" />
    </span>
    </label>
    <label className="flex items-center gap-3 whitespace-nowrap text-sm font-medium">
      Prior knowledge
      <span className="relative inline-grid">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 pl-2 pr-6">Needs review</span>
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 pl-2 pr-6">Already knew</span>
      <select
        aria-busy={pending}
        disabled={pending}
        value={source}
        onChange={(event) => changeFilter(value, event.target.value)}
        className="col-start-1 row-start-1 h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-background pl-2 pr-6 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="all">All</option>
        <option value="known">Already knew</option>
        <option value="here">Learned here</option>
      </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2" />
      </span>
    </label>
    </div>
  );
}
