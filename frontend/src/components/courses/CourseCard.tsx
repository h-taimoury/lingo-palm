import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";

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
      className="group mx-auto block w-full max-w-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full gap-0 overflow-hidden py-0 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg rounded border-2 border-gray-300">
        <div className="relative aspect-16/10 overflow-hidden bg-muted">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={`${course.title} course thumbnail`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 320px, 320px"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <span className="flex flex-col items-center gap-2 text-sm">
                <ImageIcon className="size-6" aria-hidden="true" />
                No thumbnail
              </span>
            </div>
          )}

          <Badge
            className={cn(
              "absolute bottom-3 left-3 h-6 border px-2.5 shadow-sm",
              levelStyles[course.level],
            )}
          >
            {course.level}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h2 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {course.description || "No description yet."}
          </p>

          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            View course
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </div>
      </Card>
    </Link>
  );
}
