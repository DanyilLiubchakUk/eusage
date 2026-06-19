import {
  OrganizationSwitcher,
  UserButton,
  useAuth,
  useOrganization,
} from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import {
  Building2,
  LayoutDashboard,
  Loader2,
  LogIn,
  MonitorPlay,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

type NavLink = {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_LINKS: NavLink[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/developers", label: "Developers", icon: Users },
  { to: "/tv", label: "TV", icon: MonitorPlay },
]

type OrganizationShellInput = {
  authLoaded: boolean
  isSignedIn: boolean
  organizationLoaded: boolean
  organizationName?: string | null
  organizationSlug?: string | null
  role?: string | null
}

export type OrganizationShellState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "no-organization" }
  | {
      status: "active"
      organizationName: string
      organizationSlug: string | null
      roleLabel: string | null
    }

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
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const {
    isLoaded: organizationLoaded,
    membership,
    organization,
  } = useOrganization()
  const organizationState = resolveOrganizationShellState({
    authLoaded,
    isSignedIn: isSignedIn === true,
    organizationLoaded,
    organizationName: organization?.name,
    organizationSlug: organization?.slug,
    role: membership?.roleName ?? membership?.role,
  })
  const organizationSlot = authLoaded && isSignedIn === true ? (
    <OrganizationSwitcher />
  ) : null

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

        <div className="ml-auto flex items-center gap-2 max-md:order-2 max-sm:w-full max-sm:flex-wrap max-sm:justify-end">
          <OrganizationShellStatus
            state={organizationState}
            organizationSlot={organizationSlot}
          />
          <ThemeToggle />
          <div className="inline-flex min-w-7 items-center">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  )
}

export function resolveOrganizationShellState(
  input: OrganizationShellInput
): OrganizationShellState {
  if (!input.authLoaded || (input.isSignedIn && !input.organizationLoaded)) {
    return { status: "loading" }
  }

  if (!input.isSignedIn) {
    return { status: "signed-out" }
  }

  if (input.organizationName == null) {
    return { status: "no-organization" }
  }

  return {
    status: "active",
    organizationName: input.organizationName.trim() || "Organization",
    organizationSlug: input.organizationSlug ?? null,
    roleLabel: formatOrganizationRole(input.role),
  }
}

export function OrganizationShellStatus({
  organizationSlot,
  state,
}: {
  organizationSlot?: ReactNode
  state: OrganizationShellState
}) {
  const copy = organizationShellCopy(state)
  const Icon = copy.icon

  return (
    <div
      aria-label="Organization context"
      className={cn(
        "inline-flex min-h-10 max-w-80 items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-left shadow-xs",
        "max-sm:min-w-0 max-sm:flex-1",
        copy.tone === "muted" && "border-border",
        copy.tone === "warning" && "border-amber-500/30 bg-amber-500/10",
        copy.tone === "active" && "border-emerald-500/30 bg-emerald-500/10"
      )}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md",
          copy.tone === "muted" && "bg-muted text-muted-foreground",
          copy.tone === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
          copy.tone === "active" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        )}
        aria-hidden="true"
      >
        <Icon className={cn("size-4", state.status === "loading" && "animate-spin")} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground">
          {copy.title}
        </span>
        <span className="block truncate text-[0.72rem] text-muted-foreground">
          {copy.detail}
        </span>
      </span>

      {organizationSlot ? (
        <span className="ml-1 inline-flex shrink-0 items-center" aria-label="Organization actions">
          {organizationSlot}
        </span>
      ) : null}
    </div>
  )
}

function navLinkClass(active = false) {
  return cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground",
    active && "bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary"
  )
}

function organizationShellCopy(state: OrganizationShellState): {
  detail: string
  icon: LucideIcon
  title: string
  tone: "active" | "muted" | "warning"
} {
  if (state.status === "loading") {
    return {
      detail: "Checking workspace",
      icon: Loader2,
      title: "Organization loading",
      tone: "muted",
    }
  }

  if (state.status === "signed-out") {
    return {
      detail: "Sign in to choose an Organization",
      icon: LogIn,
      title: "Signed out",
      tone: "muted",
    }
  }

  if (state.status === "no-organization") {
    return {
      detail: "Create or select an Organization",
      icon: Building2,
      title: "No Organization selected",
      tone: "warning",
    }
  }

  return {
    detail: state.roleLabel ?? "Active Organization",
    icon: Building2,
    title: state.organizationName,
    tone: "active",
  }
}

function formatOrganizationRole(role: string | null | undefined) {
  const normalizedRole = role?.trim()
  if (!normalizedRole) return null

  return normalizedRole.replace(/^org:/, "").replace(/[-_]/g, " ")
}
