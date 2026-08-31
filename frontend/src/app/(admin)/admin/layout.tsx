import { redirect } from "next/navigation"
import { AdminNav } from "@/components/navigation/AdminNav"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user.is_staff) redirect("/courses")
  return <div className="min-h-dvh bg-muted/20"><AdminNav user={user} /><main>{children}</main></div>
}
