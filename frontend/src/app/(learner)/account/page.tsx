import type { Metadata } from "next"
import { AccountForm } from "@/components/account/AccountForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { formatDate } from "@/lib/utils"
export const metadata: Metadata = { title: "Account" }
export default async function Page() { const user = await getCurrentUser(); return <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6"><PageHeader title="Account" description="Update the profile fields supported by Django’s /users/me/ endpoint." /><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]"><Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent><AccountForm user={user} /></CardContent></Card><Card><CardHeader><CardTitle>Account details</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="text-muted-foreground">Member since</span><br />{formatDate(user.created_at)}</p><p><span className="text-muted-foreground">Role</span><br />{user.is_staff ? "Staff" : "Learner"}</p></CardContent></Card></div></div> }
