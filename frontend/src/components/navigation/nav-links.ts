export type NavIconName =
  | "analytics"
  | "courses"
  | "dictionary"
  | "review"
  | "scraper"
  | "shield"
  | "user"
  | "users"

export type NavItem = {
  title: string
  href: string
  icon: NavIconName
  activePrefix?: string
}

export const learnerNavLinks: readonly NavItem[] = [
  {
    title: "Courses",
    href: "/courses",
    icon: "courses",
    activePrefix: "/courses",
  },
  {
    title: "My vocabulary",
    href: "/my-vocabulary",
    icon: "dictionary",
    activePrefix: "/my-vocabulary",
  },
  {
    title: "Review",
    href: "/review/flashcard",
    icon: "review",
    activePrefix: "/review",
  },
]

export const learnerAccountLink: NavItem = {
  title: "Account",
  href: "/account",
  icon: "user",
  activePrefix: "/account",
}

export const adminLink: NavItem = {
  title: "Admin",
  href: "/admin/courses",
  icon: "shield",
  activePrefix: "/admin",
}

export const learnerViewLink: NavItem = {
  title: "Learner view",
  href: "/courses",
  icon: "courses",
}

const adminNavLinks: readonly NavItem[] = [
  {
    title: "Courses",
    href: "/admin/courses",
    icon: "courses",
    activePrefix: "/admin/courses",
  },
  {
    title: "Dictionary",
    href: "/admin/dictionary",
    icon: "dictionary",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: "users",
    activePrefix: "/admin/users",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: "analytics",
    activePrefix: "/admin/analytics",
  },
]

const scraperLink: NavItem = {
  title: "Scraper",
  href: "/admin/dictionary/scrape",
  icon: "scraper",
  activePrefix: "/admin/dictionary/scrape",
}

export function getAdminNavLinks(enableScraper: boolean): readonly NavItem[] {
  return enableScraper ? [...adminNavLinks, scraperLink] : adminNavLinks
}

export function isNavItemActive(pathname: string, item: NavItem) {
  const prefix = item.activePrefix

  if (!prefix) return pathname === item.href
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}
