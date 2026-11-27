import type { Metadata } from "next"
import Link from "next/link"
import { AccountForm } from "@/components/account/AccountForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { formatDate } from "@/lib/utils"
import { getLocale, getTranslations } from "@/lib/i18n/server";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("Account") };
}
export default async function Page() {
  const t = await getTranslations();
  const locale = await getLocale();
 const user = await getCurrentUser(); return <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6"><PageHeader title={t("Account")} description={t("Update the profile fields supported by Django’s /users/me/ endpoint.")} /><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]"><Card><CardHeader><CardTitle>{t("Profile")}</CardTitle></CardHeader><CardContent><AccountForm user={user} /></CardContent></Card><Card><CardHeader><CardTitle>{t("Account details")}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="text-muted-foreground">{t("Member since")}</span><br />{formatDate(user.created_at, locale)}</p><p><span className="text-muted-foreground">{t("Role")}</span><br />{user.is_staff ? t("Staff") : t("Learner")}</p><Link href="/plans" className="font-medium text-primary underline-offset-4 hover:underline">{t("View subscription")}</Link></CardContent></Card></div></div> }
