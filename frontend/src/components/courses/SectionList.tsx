import Link from "next/link";
import { CheckCircle2, CirclePlay } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SectionSummary } from "@/types/api/courses";

export function SectionList({
  courseId,
  sections,
}: {
  courseId: number;
  sections: SectionSummary[];
}) {
  if (!sections.length)
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No published sections yet.
      </div>
    );
  return (
    <div className="grid gap-3">
      {sections.map((section) => {
        const learned = section.learned_percentage ?? 0;
        return (
          <Link
            key={section.id}
            href={`/courses/${courseId}/sections/${section.id}`}
            className="group rounded-xl border border-orange-200 bg-orange-100 p-4 shadow-sm transition hover:bg-orange-200"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground">
                {learned >= 100 ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <CirclePlay className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold group-hover:underline">
                    {section.title}
                  </h3>
                  <Badge variant="outline">Section {section.order}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress
                    value={learned}
                    className="h-2 flex-1 [&_[data-slot=progress-track]]:bg-white"
                  />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {learned}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {section.new_words_count ?? 0} new senses
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
