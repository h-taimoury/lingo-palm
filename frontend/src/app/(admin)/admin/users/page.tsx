import { UserManager } from "@/components/admin/users/UserManager"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { getAdminUsers } from "@/lib/admin/server"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { parsePositivePage, buildUrl } from "@/lib/courses/query"
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) { const params = await searchParams; const page = parsePositivePage(params.page); const [data, current] = await Promise.all([getAdminUsers(page, buildUrl("/admin/users", { page })), getCurrentUser()]); return <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6"><PageHeader title="Users" description="This screen reflects Django’s admin-only user list/detail endpoints. The backend does not expose user search, so this list is paginated by ID." /><div className="mt-7 overflow-hidden rounded-xl border bg-card">{data.results.map((user) => <UserManager key={user.id} user={user} isSelf={user.id === current.id} />)}</div><Pagination page={page} count={data.count} makeHref={(next) => buildUrl("/admin/users", { page: next })} /></div> }
