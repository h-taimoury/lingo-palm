import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video-player/VideoPlayer";
import {
  getLearnerSection,
  getSectionTaughtSenses,
} from "@/lib/courses/learner";
import { proxyDjangoMediaUrl } from "@/lib/media.server";
import { cn } from "@/lib/utils";

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
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/courses/${courseId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {section.course.title}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{section.title}</h1>
        </div>
        <Link
          href={`${returnTo}/vocabulary`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Section vocabulary
        </Link>
      </div>
      <VideoPlayer
        source={section.video_url}
        subtitleSource={proxyDjangoMediaUrl(section.subtitle_file)}
        mappings={section.word_sense_mappings}
        initialLearnedSenseIds={learnedIds}
        title={section.title}
      />
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge variant="outline">
          {section.new_words_count ?? 0} new senses
        </Badge>
        <Badge variant="outline">
          {section.learned_percentage ?? 0}% learned
        </Badge>
      </div>
    </div>
  );
}
