import {
  BarChart3,
  GraduationCap,
  LibraryBig,
  Shield,
  Sparkles,
  UserRound,
  UsersRound,
  WandSparkles,
} from "lucide-react"

import type { NavIconName } from "./nav-links"

const icons = {
  analytics: BarChart3,
  courses: GraduationCap,
  dictionary: LibraryBig,
  review: Sparkles,
  scraper: WandSparkles,
  shield: Shield,
  user: UserRound,
  users: UsersRound,
} satisfies Record<NavIconName, typeof GraduationCap>

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = icons[name]
  return <Icon className={className} aria-hidden="true" />
}
