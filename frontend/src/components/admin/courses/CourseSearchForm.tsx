"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CourseSearchFormProps = {
  search: string;
};

export function CourseSearchForm({ search }: CourseSearchFormProps) {
  const [value, setValue] = useState(search);

  const normalizedValue = value.trim();
  const canSearch = normalizedValue.length > 0 && normalizedValue !== search;

  return (
    <form
      action="/admin/courses"
      method="get"
      className="mt-6 flex max-w-xl items-center gap-2"
    >
      <Input
        name="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search courses…"
      />

      <Button type="submit" disabled={!canSearch} className="w-20">
        Search
      </Button>

      <div className="w-16">
        {search ? (
          <Link
            href="/admin/courses"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
