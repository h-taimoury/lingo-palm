import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { VideoPlayer } from "@/components/video-player/VideoPlayer";
import {
  getLearnerSection,
  getSectionTaughtSenses,
} from "@/lib/courses/learner";
import { proxyDjangoMediaUrl } from "@/lib/media.server";

type Props = { params: Promise<{ courseId: string; sectionId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId, sectionId } = await params;
  const section = await getLearnerSection(
    courseId,
    sectionId,
    `/courses/${courseId}/sections/${sectionId}`,
  );
  return { title: section.title };
}
export default async function SectionPage({ params }: Props) {
  const { courseId, sectionId } = await params;
  const returnTo = `/courses/${courseId}/sections/${sectionId}`;
  const [section, taught] = await Promise.all([
    getLearnerSection(courseId, sectionId, returnTo),
    getSectionTaughtSenses(sectionId, returnTo),
  ]);
  const learnedIds = taught
    .filter((row) => row.is_learned)
    .map((row) => row.sense.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        {section.course.title}
      </Link>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="section-title" className="flex min-w-0 flex-col gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Section
            </p>
            <h1 id="section-title" className="mt-1 text-pretty text-3xl font-semibold leading-tight tracking-tight">
              {section.title}
            </h1>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-semibold leading-none tabular-nums">
                  {section.new_words_count ?? 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">new senses to learn</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Vocabulary progress</span>
                <span className="font-medium tabular-nums">
                  {section.learned_percentage ?? 0}% learned
                </span>
              </div>
              <Progress value={section.learned_percentage ?? 0} aria-label="Vocabulary learned" />
            </div>
          </div>

          <Link
            href={`${returnTo}/vocabulary`}
            className="group inline-flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col">
                <span className="font-medium">Section vocabulary</span>
                <span className="text-sm text-muted-foreground">
                  Review every word in this section
                </span>
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </section>

        <div className="min-w-0 lg:sticky lg:top-8 lg:has-[.w-screen]:static lg:has-[.w-screen]:col-span-2">
          <VideoPlayer
            source={section.video_url}
            subtitleSource={proxyDjangoMediaUrl(section.subtitle_file)}
            mappings={section.word_sense_mappings}
            initialLearnedSenseIds={learnedIds}
            initialKnownSenseIds={taught.filter((row) => row.already_known).map((row) => row.sense.id)}
            title={section.title}
          />
        </div>
      </div>
    </div>
  );
}
