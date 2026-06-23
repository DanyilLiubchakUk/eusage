import { LayoutDashboard, MonitorPlay, Users } from "lucide-react"

const NAV_LINKS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, active: true },
  { to: "/developers", label: "Developers", icon: Users, active: false },
  { to: "/tv", label: "TV", icon: MonitorPlay, active: false },
]

function WebLogo() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="block size-full">
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
    <header className="app-nav sticky top-0 z-50 border-b border-[var(--surface-hairline)] bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center gap-4 px-6 max-md:px-5">
        <a
          href="/"
          className="app-nav-brand inline-flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-foreground no-underline"
          aria-label="eUsage home"
        >
          <span className="block size-7 overflow-hidden rounded-[9px] ring-1 ring-[var(--surface-hairline)]" aria-hidden="true">
            <WebLogo />
          </span>
          <span>eUsage</span>
        </a>
        <nav
          className="app-nav-links ml-2 flex items-center gap-1 max-md:order-3 max-md:ml-0 max-md:w-full max-md:overflow-x-auto max-md:pt-2 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
          aria-label="Primary navigation"
        >
          {NAV_LINKS.map(({ to, label, icon: Icon, active }) => (
            <a
              key={to}
              href={to}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.85rem] font-medium no-underline transition-colors ${
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={15} aria-hidden={true} strokeWidth={2.25} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex min-w-7 items-center">
            <div className="size-7 rounded-full bg-secondary ring-1 ring-[var(--surface-hairline)]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  )
}
