"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ReviewDueTime({ value }: { value: string }) {
  const label = useSyncExternalStore(subscribe, () => {
    const date = new Date(value);
    return date.getTime() <= Date.now()
      ? "Due now"
      : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }, () => "Scheduled");
  return <time dateTime={value}>{label}</time>;
}
