import { UserButton } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import { LayoutDashboard, MonitorPlay, Settings2, Users, type LucideIcon } from "lucide-react"
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
  { to: "/setup", label: "Setup", icon: Settings2 },
]

function WebLogo() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className="app-brand-logo"
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
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link to="/" className="app-brand" aria-label="eUsage home">
          <span className="app-brand-mark" aria-hidden="true">
            <WebLogo />
          </span>
          <span className="app-brand-text">eUsage</span>
        </Link>

        <nav className="app-nav-links" aria-label="Primary navigation">
          {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className="app-nav-link"
              activeProps={{ className: "app-nav-link app-nav-link--active" }}
              activeOptions={exact ? { exact: true } : undefined}
            >
              <Icon size={16} aria-hidden={true} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="app-nav-actions">
          <ThemeToggle />
          <div className="app-nav-user">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  )
}
