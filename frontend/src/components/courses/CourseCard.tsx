"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageIcon, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CourseSummary } from "@/types/api/courses";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

const levelStyles: Record<CourseSummary["level"], string> = {
  Beginner: "border-emerald-300/60 bg-emerald-500 text-white",
  Intermediate: "border-amber-300/70 bg-amber-400 text-amber-950",
  Advanced: "border-rose-300/60 bg-rose-600 text-white",
};

const badgeSize = "h-6 rounded-full border px-2.5 text-xs font-medium";

export function CourseCard({
  course,
  thumbnail,
}: {
  course: CourseSummary;
  thumbnail: string | null;
}) {
  const t = useTranslations();

  const locked = course.has_access === false;
  return (
    <Link
      href={locked ? "/plans" : `/courses/${course.id}`}
      className="group mx-auto block w-full max-w-70 rounded-2xl lg:max-w-78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full gap-4 rounded-2xl border border-orange-200 bg-orange-100 p-4 shadow-xl ring-0 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-2xl">
        <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-muted">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={t("{0} course thumbnail", { 0: course.title })}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(min-width: 64rem) 17.375rem, 15.375rem"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <span className="flex flex-col items-center gap-2 text-sm">
                <ImageIcon className="size-6" aria-hidden="true" />
                {t("No thumbnail")}</span>
            </div>
          )}

        </div>

        <div className="flex flex-1 flex-col">
          <h2 dir="auto" className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h2>
          <p dir="auto" className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {course.description || t("No description yet.")}
          </p>

          <div className="mt-auto flex min-h-14 items-center justify-between gap-2 pt-5">
            <Badge className={cn(badgeSize, levelStyles[course.level])}>
              {t(course.level)}
            </Badge>
            {locked ? (
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-orange-300 bg-orange-50 text-orange-950 transition-colors group-hover:bg-orange-200">
                <Lock className="size-5.5" aria-hidden="true" />
                <span className="sr-only">{t("Subscription required. Open subscription plans.")}</span>
              </span>
            ) : course.is_free ? (
              <Badge className={cn(badgeSize, "border-teal-200 bg-teal-100 text-teal-900")}>{t("Free")}</Badge>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
