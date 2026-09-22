"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildUrl } from "@/lib/courses/query";

type SearchFormProps = {
  action: string;
  search: string;
  placeholder: string;
  label: string;
};

export function SearchForm(props: SearchFormProps) {
  return <SearchFormFields key={`${props.action}:${props.search}`} {...props} />;
}

function SearchFormFields({ action, search, placeholder, label }: SearchFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(search);
  const [pending, startTransition] = useTransition();
  const normalizedValue = value.trim();
  const canSearch = normalizedValue !== search.trim() && !pending;

  function navigate(query: string) {
    const href = buildUrl(action, { search: query });
    startTransition(() => {
      if (href === `${window.location.pathname}${window.location.search}`) {
        router.refresh();
      } else {
        router.push(href);
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSearch) return;
    navigate(normalizedValue);
  }

  return (
    <form
      action={action}
      method="get"
      onSubmit={submit}
      role="search"
      aria-label={label}
      aria-busy={pending}
      className="mt-6 flex max-w-xl items-center gap-2"
    >
      <Input
        type="search"
        name="search"
        aria-label={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="min-w-0 flex-1"
      />
      <Button type="submit" disabled={!canSearch} className="w-20 shrink-0">
        Search
      </Button>
      <div className="w-16 shrink-0">
        {search ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="w-full"
            onClick={() => {
              setValue("");
              navigate("");
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
