import { Navbar } from "@/components/navigation/Navbar";
import {
  getAdminNavLinks,
  learnerViewLink,
} from "@/components/navigation/nav-links";
import { publicEnv } from "@/lib/env";
import type { User } from "@/types/api/users";

export function AdminNav({ user }: { user: User }) {
  return (
    <Navbar
      homeHref="/admin/courses"
      links={getAdminNavLinks(publicEnv.enableScraper)}
      utilityLinks={[learnerViewLink]}
      contextLabel="Admin"
      userLabel={user.full_name || user.email}
    />
  );
}
