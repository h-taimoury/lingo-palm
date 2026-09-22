import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionList } from "@/components/courses/SectionList";
import { getLearnerCourse } from "@/lib/courses/learner";
import { proxyDjangoMediaUrl } from "@/lib/media.server";

type Props = { params: Promise<{ courseId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getLearnerCourse(courseId, `/courses/${courseId}`);
  return { title: course.title };
}
export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const course = await getLearnerCourse(courseId, `/courses/${courseId}`);
  const thumbnail = proxyDjangoMediaUrl(course.thumbnail);
  return (
    <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:px-8">
      <Link
        href="/courses"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All courses
      </Link>
      <div className="mt-6 grid gap-8 rounded-3xl bg-orange-100 p-5 sm:p-8 lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex flex-col items-start justify-center gap-6 py-4 text-left">
          <Badge variant="secondary">{course.level}</Badge>
          <h1 className="text-5xl font-extrabold tracking-tight">
            {course.title}
          </h1>
          <p className="whitespace-pre-line leading-7 text-muted-foreground">
            {course.description || "No description yet."}
          </p>
        </div>
        <div>
          {thumbnail ? (
            <div className="relative aspect-video overflow-hidden rounded-2xl border">
              <Image
                src={thumbnail}
                alt=""
                fill
                sizes="(min-width: 1152px) 422px, (min-width: 1024px) calc(40vw - 38.4px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="grid aspect-video place-items-center rounded-2xl border bg-muted text-muted-foreground">
              No thumbnail
            </div>
          )}
        </div>
      </div>
      <section className="mt-10 mx-auto max-w-xl">
        <h2 className="text-xl font-semibold">Sections</h2>
        <div className="mt-4">
          <SectionList courseId={course.id} sections={course.sections} />
        </div>
      </section>
    </div>
  );
}
