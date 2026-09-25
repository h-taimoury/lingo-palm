import { LearnerNav } from "@/components/navigation/LearnerNav";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh bg-background">
      <LearnerNav user={user} />
      <main className="[container-type:inline-size]">{children}</main>
    </div>
  );
}
