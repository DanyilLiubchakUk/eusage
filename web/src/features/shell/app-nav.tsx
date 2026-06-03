import { UserButton } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import { LayoutDashboard, MonitorPlay, Settings2, Users, type LucideIcon } from "lucide-react"
import eUsageLogoUrl from "../../../../src-tauri/icons/eusage.svg"
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

export function AppNav() {
  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link to="/" className="app-brand" aria-label="eUsage home">
          <span className="app-brand-mark" aria-hidden="true">
            <img src={eUsageLogoUrl} alt="" />
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
