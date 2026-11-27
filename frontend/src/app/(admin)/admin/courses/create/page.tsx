import Link from "next/link"
import { CourseCreateForm } from "@/components/admin/courses/CourseCreateForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTranslations } from "@/lib/i18n/server";
export default async function Page() {
  const t = await getTranslations();
 return <div className="mx-auto max-w-3xl px-4 py-9 sm:px-6"><Link href="/admin/courses" className="text-sm text-muted-foreground hover:text-foreground">{t("← Courses")}</Link><Card className="mt-5"><CardHeader><CardTitle>{t("Create course")}</CardTitle></CardHeader><CardContent><CourseCreateForm /></CardContent></Card></div> }
