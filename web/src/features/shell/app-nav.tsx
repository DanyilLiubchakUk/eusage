import { UserButton } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import { LayoutDashboard, MonitorPlay, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

type NavLink = {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_LINKS: NavLink[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/developers", label: "Developers", icon: Users },
  { to: "/tv", label: "TV", icon: MonitorPlay },
]

function WebLogo() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className="block size-full"
    >
      <rect width="64" height="64" rx="14" fill="var(--brand)" />
      <circle cx="32" cy="32" r="20" fill="var(--brand-mark)" />
      <path
        d="M18 35c0-8 6-14 14-14 7 0 13 5 14 12H26c1 4 4 7 9 7 3 0 6-1 8-3l4 5c-3 3-7 5-12 5-10 0-17-5-17-12zm9-6h11c-1-2-3-4-6-4s-5 1-5 4z"
        fill="var(--brand)"
      />
    </svg>
  )
}

export function AppNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-15 w-full max-w-6xl items-center gap-4 px-6 max-md:flex-wrap max-md:gap-2 max-md:px-4 max-md:py-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[1.1rem] font-extrabold text-foreground no-underline"
          aria-label="eUsage home"
        >
          <span
            className="block size-8 overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--input)]"
            aria-hidden="true"
          >
            <WebLogo />
          </span>
          <span>eUsage</span>
        </Link>

        <nav
          className="ml-3 flex items-center gap-1 max-md:order-3 max-md:ml-0 max-md:w-full max-md:overflow-x-auto"
          aria-label="Primary navigation"
        >
          {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={navLinkClass()}
              activeProps={{ className: navLinkClass(true) }}
              activeOptions={exact ? { exact: true } : undefined}
            >
              <Icon size={16} aria-hidden={true} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="inline-flex min-w-7 items-center">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  )
}

function navLinkClass(active = false) {
  return cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground",
    active && "bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary"
  )
}
