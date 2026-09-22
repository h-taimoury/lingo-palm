import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CourseSummary } from "@/types/api/courses";

const levelStyles: Record<CourseSummary["level"], string> = {
  Beginner: "border-emerald-300/60 bg-emerald-500 text-white",
  Intermediate: "border-amber-300/70 bg-amber-400 text-amber-950",
  Advanced: "border-rose-300/60 bg-rose-600 text-white",
};

export function CourseCard({
  course,
  thumbnail,
}: {
  course: CourseSummary;
  thumbnail: string | null;
}) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group mx-auto block w-full max-w-70 rounded-2xl lg:max-w-78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full gap-4 rounded-2xl border border-orange-200 bg-orange-100 p-4 shadow-xl ring-0 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-2xl">
        <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-muted">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={`${course.title} course thumbnail`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(min-width: 64rem) 17.375rem, 15.375rem"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <span className="flex flex-col items-center gap-2 text-sm">
                <ImageIcon className="size-6" aria-hidden="true" />
                No thumbnail
              </span>
            </div>
          )}

        </div>

        <div className="flex flex-1 flex-col">
          <h2 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {course.description || "No description yet."}
          </p>

          <div className="mt-auto pt-5">
            <Badge
              className={cn(
                "h-6 rounded-full border px-2.5 text-xs font-medium",
                levelStyles[course.level],
              )}
            >
              {course.level}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
