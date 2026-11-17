import { LearnerNav } from "@/components/navigation/LearnerNav";
import { getOptionalCurrentUser } from "@/lib/auth/getOptionalCurrentUser";
import { getCurrentRequestPath } from "@/lib/api/server";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalCurrentUser(await getCurrentRequestPath("/courses"));
  return (
    <div className="min-h-dvh bg-background">
      <LearnerNav user={user} />
      <main className="[container-type:inline-size]">{children}</main>
    </div>
  );
}
