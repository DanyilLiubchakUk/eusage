import { SignInButton } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BarChart3,
  CircleCheck,
  LayoutDashboard,
  MonitorPlay,
  type LucideIcon,
  Users,
  Zap,
} from "lucide-react"
import { useMemo, useRef } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BrandLogo } from "../shell/brand-logo"
import { ThemeToggle } from "../shell/theme-toggle"
import { buildAdminOverviewModel } from "../dashboard/admin-overview-data"
import { formatCount, formatProviderName, formatUsd } from "../dashboard/dashboard-formatting"
import { buildPreviewSliderConfig } from "./preview-slider-utils"
import { usePreviewSliders } from "./use-preview-sliders"
import type { ReadyDashboardState } from "../dashboard/dashboard-source"
import {
  LANDING_COST_ESTIMATE_NOTE,
  landingMockState,
  landingMockNow,
} from "./landing-mock-state"

const landingMockModel = buildAdminOverviewModel(
  landingMockState as unknown as ReadyDashboardState,
  landingMockNow
)

const PRIMARY_NAV = [
  { to: "/overview", label: "Overview" },
  { to: "/developers", label: "Developers" },
  { to: "/tv", label: "TV" },
] as const

const FEATURES = [
  {
    icon: BarChart3,
    title: "Spend you can read",
    body: "Tokens, API-equivalent estimates, provider-reported dollars, and provider mix in one view.",
  },
  {
    icon: Users,
    title: "Developers, organized",
    body: "Group developers into organizations, mint connection tokens, and watch devices sync in real time.",
  },
  {
    icon: MonitorPlay,
    title: "TV mode for the wall",
    body: "Share a read-only live display for the office TV without exposing admin controls or tokens.",
  },
] as const

const PROOFS = [
  { label: "Token series", value: "Per-day, per-developer" },
  { label: "Provider mix", value: "Cursor · Codex · Claude · JetBrains" },
  { label: "Cursor budget", value: "Pool + coverage" },
  { label: "Sync health", value: "Live · recent · stale" },
] as const

const STEPS = [
  {
    icon: Users,
    title: "Create an organization",
    body: "Owners and admins get a workspace. Invite developers, set roles, mint tokens.",
  },
  {
    icon: Zap,
    title: "Connect desktop apps",
    body: "Developers paste a connection string into Cursor, Codex, or Claude Desktop.",
  },
  {
    icon: LayoutDashboard,
    title: "Watch the Overview",
    body: "Usage, provider breakdown, sync health, and quota pressure fill in as devices report.",
  },
] as const

export function LandingPage() {
  return (
    <main className="landing-page surface-grain min-h-screen bg-background text-foreground">
      <LandingHeader />
      <Hero />
      <ProofStrip />
      <Features />
      <HowItWorks />
      <CtaBand />
      <LandingFooter />
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function LandingHeader() {
  return (
    <header className="landing-header sticky top-0 z-50 border-b border-[var(--surface-hairline)] bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center gap-4 px-6 max-md:px-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-foreground no-underline"
          aria-label="eUsage home"
        >
          <span
            className="block size-7 overflow-hidden rounded-[9px] ring-1 ring-[var(--surface-hairline)]"
            aria-hidden="true"
          >
            <BrandLogo />
          </span>
          <span>eUsage</span>
        </Link>

        <nav
          className="ml-2 flex items-center gap-1 max-md:ml-auto"
          aria-label="Landing sections"
        >
          {PRIMARY_NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-md px-2.5 py-1.5 text-[0.85rem] font-medium text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-2 max-md:hidden">
            <SignInButton mode="modal">
              <Button type="button" variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <Link
              className={buttonVariants({ size: "sm" })}
              to="/overview"
            >
              Open app
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--surface-hairline)]">
      <HeroBackdrop />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-6 py-14 max-md:px-5 max-md:py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="grid gap-5">
          <h1 className="overview-title m-0 text-[clamp(2.5rem,6vw,4.75rem)] font-black leading-[0.95] tracking-tight">
            See where your AI spend actually goes.
          </h1>
          <p className="overview-lede m-0 max-w-xl text-lg leading-8">
            eUsage connects desktop apps, groups developers into organizations,
            and gives owners a clean Overview, Developers, and TV dashboard for
            real usage, with estimates marked clearly.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className={buttonVariants({ size: "lg" })}
              to="/overview"
            >
              Open app
              <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
            </Link>
            <SignInButton mode="modal">
              <Button type="button" variant="outline" size="lg">
                Sign in
              </Button>
            </SignInButton>
            <Link
              className={buttonVariants({ variant: "ghost", size: "lg" })}
              to="/setup"
            >
              Start setup
            </Link>
          </div>
          <ul className="m-0 grid gap-2 p-0 text-sm text-muted-foreground">
            {[
              "No credit card to explore the demo",
              "Self-hosted or hosted — your call",
              "Read-only TV link for the office wall",
            ].map((line) => (
              <li
                key={line}
                className="flex items-center gap-2"
              >
                <CircleCheck
                  className="size-4 text-[var(--accent-green)]"
                  aria-hidden="true"
                  strokeWidth={2.5}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <HeroPreview />
      </div>
    </section>
  )
}

function HeroBackdrop() {
  return (
    <div className="absolute inset-0 -z-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)]" />
      <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-green-soft),transparent)]" />
    </div>
  )
}

const PREVIEW_TILT_MAX = 3
const PREVIEW_TILT_FOLLOW = "transform 0.28s cubic-bezier(0.33, 1, 0.68, 1)"
const PREVIEW_TILT_ENTER = "transform 0.55s cubic-bezier(0.33, 1, 0.68, 1)"

function setPreviewTilt(card: HTMLElement, rotateX: number, rotateY: number, entering = false) {
  card.dataset.tiltX = rotateX.toFixed(2)
  card.dataset.tiltY = rotateY.toFixed(2)
  card.style.transition = entering ? PREVIEW_TILT_ENTER : PREVIEW_TILT_FOLLOW
  card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`
}

function resetPreviewTilt(card: HTMLElement) {
  const rotateX = Number(card.dataset.tiltX ?? 0)
  const rotateY = Number(card.dataset.tiltY ?? 0)
  const tilt = Math.min(Math.hypot(rotateX, rotateY), PREVIEW_TILT_MAX)
  const intensity = tilt / PREVIEW_TILT_MAX
  const duration = 0.4 + intensity * 0.65
  const bounce = 1.2 + intensity * 1.1
  card.style.transition = `transform ${duration.toFixed(2)}s cubic-bezier(0.22, ${bounce.toFixed(2)}, 0.36, 1)`
  card.style.transform = "rotateX(0deg) rotateY(0deg)"
  delete card.dataset.tiltX
  delete card.dataset.tiltY
}

function formatPreviewProviderName(providerId: string) {
  if (providerId === "jetbrains-ai-assistant") return "JBA AI"
  return formatProviderName(providerId)
}

function HeroPreview() {
  const providerRows = useMemo(
    () =>
      [...landingMockModel.providerBreakdownRows].sort(
        (left, right) => right.value - left.value
      ),
    []
  )
  const cursorPool = landingMockModel.cursorPool
  const providerCostsUsd = useMemo(() => {
    const costs: Record<string, number> = {}
    for (const sample of landingMockState.metricSamples) {
      if (!sample.metricKey.endsWith(".cost.estimated")) continue
      costs[sample.providerId] = (costs[sample.providerId] ?? 0) + sample.value
    }
    return costs
  }, [])
  const sliderConfig = useMemo(
    () =>
      buildPreviewSliderConfig({
        cursorLimitUsd: cursorPool.limitUsd,
        cursorUsedUsd: cursorPool.usedUsd,
        providerRows,
        providerCostsUsd,
      }),
    [cursorPool.limitUsd, cursorPool.usedUsd, providerCostsUsd, providerRows]
  )
  const {
    display,
    registerTrack,
    onPointerMove,
    onPointerLeave,
    getBarStyle,
    getThumbStyle,
  } = usePreviewSliders(sliderConfig)
  const providerDisplayById = useMemo(
    () => new Map(display.providerRows.map((row) => [row.providerId, row])),
    [display.providerRows]
  )

  const hitRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const enteringRef = useRef(true)

  return (
    <div
      ref={hitRef}
      className="relative [perspective:1000px]"
      onMouseEnter={() => {
        enteringRef.current = true
      }}
      onMouseMove={(event) => {
        const hit = hitRef.current
        const card = cardRef.current
        if (!hit || !card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        onPointerMove(event.clientX, event.clientY)
        const rect = hit.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5
        setPreviewTilt(card, -y * PREVIEW_TILT_MAX, x * PREVIEW_TILT_MAX, enteringRef.current)
        enteringRef.current = false
      }}
      onMouseLeave={() => {
        const card = cardRef.current
        onPointerLeave()
        if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        enteringRef.current = true
        resetPreviewTilt(card)
      }}
    >
      <aside
        ref={cardRef}
        aria-label="Live overview preview"
        className="overview-shell pointer-events-none w-full rounded-xl border border-[var(--surface-hairline)] bg-card p-6 will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
      {/* Hero KPI — total team usage, oversized */}
      <div className="grid gap-2 border-b border-[var(--surface-hairline)] pb-4">
        <span className="overview-kpi-label font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
          Team usage · 30 days
        </span>
        <strong className="overview-kpi-value block min-w-0 max-w-full truncate text-[clamp(2.25rem,5vw,3.25rem)] font-black leading-none tracking-tight tabular-nums">
          {formatCount(display.tokensTotal)} tokens
        </strong>
        <span className="overview-kpi-secondary text-sm font-medium tabular-nums">
          {formatUsd(display.estimatedCostUsd)} estimated
        </span>
        <span className="max-w-md text-xs leading-5 text-muted-foreground">
          {LANDING_COST_ESTIMATE_NOTE}
        </span>
      </div>

      {/* Cursor pool + top provider — side by side on xl+ and when preview is full-width (md↓, sm+) */}
      <div className="grid grid-cols-1 gap-4 border-b border-[var(--surface-hairline)] py-4 max-md:grid-cols-2 max-sm:grid-cols-1 md:grid-cols-1 xl:grid-cols-2 xl:gap-5 max-md:gap-5">
        {cursorPool.available ? (
          <div className="grid min-w-0 gap-2">
            <span className="overview-kpi-label font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em]">
              Cursor Shared Pool
            </span>
            <strong className="overview-kpi-value block text-lg font-extrabold leading-6 tabular-nums">
              {display.cursorBudgetLabel}
            </strong>
            <span className="overview-kpi-secondary block text-xs font-medium tabular-nums">
              {display.cursorUsedPct}% used · ${display.cursorRemainingUsd.toFixed(0)} left
            </span>
            <div
              ref={registerTrack("cursor-pool")}
              className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-inset)]"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-green)]"
                style={getBarStyle("cursor-pool", display.cursorUsedPct)}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--surface-hairline)] bg-[var(--accent-green)] shadow-sm"
                style={getThumbStyle("cursor-pool", display.cursorUsedPct)}
              />
            </div>
          </div>
        ) : null}

        {display.topProvider ? (
          <div className="grid min-w-0 gap-2 border-[var(--surface-hairline)] max-sm:mt-4 max-sm:border-t max-sm:pt-4 max-md:mt-0 max-md:border-t-0 max-md:border-l max-md:pl-5 max-md:pt-0 max-sm:border-l-0 max-sm:pl-0 md:mt-4 md:border-t md:pt-4 xl:mt-0 xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
            <span className="overview-kpi-label font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em]">
              Top provider
            </span>
            <strong className="overview-kpi-value block min-w-0 text-base font-extrabold leading-5 tabular-nums">
              {formatPreviewProviderName(display.topProvider.providerId)} ·{" "}
              {formatCount(display.topProvider.tokens)} tokens
            </strong>
            <span className="overview-kpi-secondary block min-w-0 text-xs font-medium tabular-nums">
              {display.nextProvider
                ? `Next: ${formatPreviewProviderName(display.nextProvider.providerId)} · ${formatCount(display.nextProvider.tokens)} tokens`
                : "Only provider with usage"}
            </span>
          </div>
        ) : null}
      </div>

      {/* Provider breakdown */}
      {providerRows.length > 0 ? (
        <div className="grid gap-2 pt-4">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--text-faint)]">
            Provider breakdown
          </span>
          {providerRows.map((row) => {
            const trackId = `provider-${row.providerId}`
            const rowDisplay = providerDisplayById.get(row.providerId)
            const barPct = rowDisplay?.barPct ?? 0
            return (
              <div key={row.providerId} className="grid gap-1">
                <p className="flex min-w-0 items-baseline gap-x-1 text-xs font-semibold tabular-nums">
                  <span className="min-w-0 truncate">{row.providerName}</span>
                  <span className="shrink-0">·</span>
                  <span className="shrink-0 text-muted-foreground">
                    {rowDisplay?.label ?? row.label}
                  </span>
                </p>
                <div
                  ref={registerTrack(trackId)}
                  className="relative h-1.5 overflow-hidden rounded-full bg-[var(--surface-inset)]"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-green)]"
                    style={getBarStyle(trackId, barPct)}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--surface-hairline)] bg-[var(--accent-green)]"
                    style={getThumbStyle(trackId, barPct)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Proof strip                                                         */
/* ------------------------------------------------------------------ */

function ProofStrip() {
  return (
    <section
      aria-label="What you get"
      className="border-b border-[var(--surface-hairline)] bg-[var(--surface-raised)] surface-grain"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 px-6 max-md:grid-cols-1 max-md:px-5">
        {PROOFS.map(({ label, value }, index) => (
          <div
            key={label}
            className={cn(
              "grid gap-1 border-[var(--surface-hairline)] px-5 py-4 max-md:px-0",
              "max-md:border-b max-md:last:border-b-0",
              "md:border-r",
              index % 2 === 0 && "md:border-l",
              index < 2 && "md:border-b"
            )}
          >
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-faint)]">
              {label}
            </span>
            <strong className="text-sm font-semibold text-foreground">{value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

function Features() {
  return (
    <section className="border-b border-[var(--surface-hairline)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 max-md:px-5 max-md:py-10">
        <div className="grid max-w-2xl gap-2">
          <h2 className="overview-title m-0 text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-tight tracking-tight">
            One dashboard for the whole AI stack.
          </h2>
          <p className="overview-lede m-0 text-base leading-7">
            Stop juggling provider consoles. eUsage pulls every device sync into
            a single source of truth for tokens, cost, and quota pressure.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="group grid gap-3 rounded-xl border border-[var(--surface-hairline)] bg-card p-5 transition-colors hover:border-[color-mix(in_srgb,var(--accent-green)_45%,var(--surface-hairline))]"
            >
              <span className="grid size-10 place-items-center rounded-lg border border-[var(--surface-hairline)] bg-[var(--surface-raised)] text-[var(--accent-green)] transition-colors group-hover:bg-[var(--accent-green-soft)]">
                <Icon className="size-5" aria-hidden="true" strokeWidth={2.25} />
              </span>
              <div className="grid gap-2">
                <h3 className="m-0 text-base font-extrabold tracking-tight">
                  {title}
                </h3>
                <p className="overview-lede m-0 text-sm leading-6">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  return (
    <section className="border-b border-[var(--surface-hairline)] bg-[var(--surface-raised)] surface-grain">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 max-md:px-5 max-md:py-10">
        <div className="grid max-w-2xl gap-2">
          <h2 className="overview-title m-0 text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-tight tracking-tight">
            Live in three steps.
          </h2>
        </div>

        <ol className="m-0 grid gap-3 p-0 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="relative grid gap-3 rounded-xl border border-[var(--surface-hairline)] bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg border border-[var(--surface-hairline)] bg-background text-[var(--accent-green)]">
                  <Icon className="size-5" aria-hidden="true" strokeWidth={2.25} />
                </span>
                <span className="font-mono text-3xl font-black tracking-tight text-[var(--surface-hairline)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="grid gap-2">
                <h3 className="m-0 text-base font-extrabold tracking-tight">{title}</h3>
                <p className="overview-lede m-0 text-sm leading-6">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function CtaBand() {
  return (
    <section className="border-b border-[var(--surface-hairline)]">
      <div className="mx-auto max-w-6xl px-6 py-14 max-md:px-5 max-md:py-10">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--surface-hairline)] bg-card px-6 py-8 max-md:px-5 max-md:py-6">
          <div
            className="absolute inset-0 -z-0 bg-[radial-gradient(900px_300px_at_30%_-50%,var(--accent-green-soft),transparent)]"
            aria-hidden="true"
          />
          <div className="relative z-10 grid gap-4 md:grid-cols-[1.4fr_auto] md:items-center">
            <div className="grid gap-2">
              <h2 className="overview-title m-0 text-[clamp(1.5rem,2.5vw,2.25rem)] font-extrabold leading-tight tracking-tight">
                Start with a demo org in under a minute.
              </h2>
              <p className="overview-lede m-0 max-w-xl text-base leading-7">
                Open the app, seed mock data, and explore the Overview. When
                you're ready, connect real desktop apps and invite your team.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link className={buttonVariants({ size: "lg" })} to="/overview">
                Open app
                <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
              </Link>
              <Link
                className={buttonVariants({ variant: "outline", size: "lg" })}
                to="/setup"
              >
                Start setup
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function LandingFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 max-md:px-5 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-2">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-foreground no-underline"
            aria-label="eUsage home"
          >
            <span
              className="block size-7 overflow-hidden rounded-[9px] ring-1 ring-[var(--surface-hairline)]"
              aria-hidden="true"
            >
              <BrandLogo />
            </span>
            <span>eUsage</span>
          </Link>
          <p className="m-0 max-w-md text-xs text-muted-foreground">
            Open-source AI usage analytics for teams. Self-host or use the
            hosted version.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
          aria-label="Footer"
        >
          {PRIMARY_NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-sm font-medium text-muted-foreground no-underline transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
          <SignInButton mode="modal">
            <Button type="button" variant="ghost" size="sm">
              Sign in
            </Button>
          </SignInButton>
        </nav>
      </div>
    </footer>
  )
}
