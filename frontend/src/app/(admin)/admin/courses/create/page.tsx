import Link from "next/link"
import { CourseCreateForm } from "@/components/admin/courses/CourseCreateForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
export default function Page() { return <div className="mx-auto max-w-3xl px-4 py-9 sm:px-6"><Link href="/admin/courses" className="text-sm text-muted-foreground hover:text-foreground">← Courses</Link><Card className="mt-5"><CardHeader><CardTitle>Create course</CardTitle></CardHeader><CardContent><CourseCreateForm /></CardContent></Card></div> }
