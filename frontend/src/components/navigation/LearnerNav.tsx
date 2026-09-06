import { Navbar } from "@/components/navigation/Navbar";
import {
  adminLink,
  learnerAccountLink,
  learnerNavLinks,
} from "@/components/navigation/nav-links";
import type { User } from "@/types/api/users";

export function LearnerNav({ user }: { user: User }) {
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
