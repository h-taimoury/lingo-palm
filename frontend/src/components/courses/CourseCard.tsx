import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { CourseSummary } from "@/types/api/courses"

export function CourseCard({ course, thumbnail }: { course: CourseSummary; thumbnail: string | null }) {
  return <Card className="overflow-hidden transition-shadow hover:shadow-md"><div className="aspect-[16/9] bg-muted">{thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">No thumbnail</div>}</div><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><Badge variant="secondary">{course.level}</Badge></div><CardTitle className="mt-2 text-xl">{course.title}</CardTitle></CardHeader><CardContent className="flex-1"><p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{course.description || "No description yet."}</p></CardContent><CardFooter><Link href={`/courses/${course.id}`} className="inline-flex items-center text-sm font-medium hover:underline">Open course <ArrowRight className="ml-1 size-4" /></Link></CardFooter></Card>
}
