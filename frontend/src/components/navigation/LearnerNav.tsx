import { Navbar } from "@/components/navigation/Navbar";
import {
  adminLink,
  learnerAccountLink,
  learnerNavLinks,
} from "@/components/navigation/nav-links";
import type { User } from "@/types/api/users";

export function LearnerNav({ user }: { user: User | null }) {
  if (!user) return <Navbar links={learnerNavLinks.slice(0, 1)} />;
  const utilityLinks = user.is_staff
    ? [learnerAccountLink, adminLink]
    : [learnerAccountLink];

  return (
    <Navbar
      links={learnerNavLinks}
      utilityLinks={utilityLinks}
      userLabel={user.full_name || user.email}
    />
  );
}
