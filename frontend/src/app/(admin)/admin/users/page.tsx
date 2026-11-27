import { UserManager } from "@/components/admin/users/UserManager"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { getAdminUsers } from "@/lib/admin/server"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { parsePositivePage, buildUrl } from "@/lib/courses/query"
import { getTranslations } from "@/lib/i18n/server";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const t = await getTranslations();
 const params = await searchParams; const page = parsePositivePage(params.page); const [data, current] = await Promise.all([getAdminUsers(page, buildUrl("/admin/users", { page })), getCurrentUser()]); return <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6"><PageHeader title={t("Users")} description={t("This screen reflects Django’s admin-only user list/detail endpoints. The backend does not expose user search, so this list is paginated by ID.")} /><div className="mt-7 overflow-hidden rounded-xl border bg-card">{data.results.map((user) => <UserManager key={user.id} user={user} isSelf={user.id === current.id} canVerifyEmail={current.is_superuser} />)}</div><Pagination page={page} count={data.count} makeHref={(next) => buildUrl("/admin/users", { page: next })} /></div> }
