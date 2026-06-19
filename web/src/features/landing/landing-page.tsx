import { SignInButton } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import {
  BarChart3,
  type LucideIcon,
  MonitorPlay,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f7f2] text-[#102119] dark:bg-[#0f1714] dark:text-[#e9f1ec]">
      <section className="relative min-h-[88vh] px-6 pb-14 pt-5 max-md:min-h-[92vh] max-md:px-4">
        <LandingScene />
        <LandingHeader />
        <div className="relative z-10 mx-auto flex min-h-[calc(88vh-5rem)] max-w-6xl items-center py-16 max-md:items-end max-md:pb-8">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex rounded-md border border-[#9ad0b0]/50 bg-[#f7fbf8]/80 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#254434] shadow-sm dark:bg-[#14211c]/80 dark:text-[#9ad0b0]">
              AI usage, teams, budget, sync
            </p>
            <h1 className="m-0 max-w-4xl text-[clamp(3.1rem,8vw,7.5rem)] font-black leading-[0.9] tracking-normal">
              eUsage shows where your AI spend is going.
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-[#3d5248] dark:text-[#c4d2cb] max-md:text-lg max-md:leading-7">
              Connect desktop apps, group developers into organizations, and give
              owners a clean Overview, Developers, and TV dashboard for real usage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={buttonVariants({ size: "lg" })} to="/overview">
                Open app
              </Link>
              <SignInButton mode="modal">
                <Button className="bg-[#1e68d7] text-white hover:bg-[#1b5fc5]" size="lg" type="button">
                  Sign in
                </Button>
              </SignInButton>
              <Link className={buttonVariants({ variant: "outline", size: "lg" })} to="/setup">
                Start setup
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-[#cddfd4] bg-[#f7fbf8] px-6 py-12 dark:border-[#9ad0b0]/15 dark:bg-[#14211c] max-md:px-4">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <FeatureItem
            icon={Users}
            title="Organizations"
            copy="Owners and admins manage developers, devices, tokens, and visibility from one place."
          />
          <FeatureItem
            icon={BarChart3}
            title="Dashboards"
            copy="Overview keeps spend, tokens, quota pressure, provider mix, and sync health together."
          />
          <FeatureItem
            icon={MonitorPlay}
            title="TV mode"
            copy="Shared display links show live team usage without exposing admin controls."
          />
        </div>
      </section>
    </main>
  )
}

function LandingHeader() {
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center gap-4">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[1.05rem] font-extrabold text-current no-underline"
        aria-label="eUsage home"
      >
        <span className="grid size-8 place-items-center rounded-md bg-[#254434] text-sm font-black text-[#9ad0b0] dark:bg-[#9ad0b0] dark:text-[#0f1714]">
          e
        </span>
        <span>eUsage</span>
      </Link>
      <nav className="ml-auto flex items-center gap-2" aria-label="Landing navigation">
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} to="/overview">
          Overview
        </Link>
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} to="/developers">
          Developers
        </Link>
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} to="/tv">
          TV
        </Link>
      </nav>
    </header>
  )
}

function LandingScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(154,208,176,0.34),rgba(37,99,235,0.13)_43%,rgba(180,83,9,0.13))] dark:bg-[linear-gradient(120deg,rgba(154,208,176,0.16),rgba(56,189,248,0.12)_48%,rgba(251,191,36,0.1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(37,68,52,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,68,52,0.08)_1px,transparent_1px)] bg-[size:44px_44px] dark:bg-[linear-gradient(rgba(154,208,176,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(154,208,176,0.08)_1px,transparent_1px)]" />
      <div className="absolute bottom-[7%] right-[4%] grid w-[min(47rem,62vw)] gap-3 opacity-95 max-md:bottom-[6%] max-md:right-[-16rem] max-md:w-[38rem]">
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
          <PreviewPanel title="Organization" value="Acme AI" detail="7 developers connected" tone="green" />
          <PreviewPanel title="Sync health" value="Fresh" detail="last update 42s ago" tone="blue" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricTile label="Tokens" value="12.8M" />
          <MetricTile label="Spend" value="$486" />
          <MetricTile label="Pressure" value="64%" />
        </div>
        <div className="grid gap-2 rounded-md border border-[#102119]/10 bg-[#f7fbf8]/86 p-4 shadow-2xl backdrop-blur dark:border-[#9ad0b0]/15 dark:bg-[#14211c]/86">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[#53665c] dark:text-[#9fb1a8]">
              Provider mix
            </span>
            <ShieldCheck className="size-4 text-[#1e68d7]" />
          </div>
          <div className="grid gap-2">
            <UsageBar label="Cursor" value="74%" width="74%" color="#254434" />
            <UsageBar label="Codex" value="51%" width="51%" color="#1e68d7" />
            <UsageBar label="Claude" value="33%" width="33%" color="#b45309" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewPanel({
  detail,
  title,
  tone,
  value,
}: {
  detail: string
  title: string
  tone: "blue" | "green"
  value: string
}) {
  const accent = tone === "blue" ? "bg-[#1e68d7]" : "bg-[#254434] dark:bg-[#9ad0b0]"
  return (
    <div className="rounded-md border border-[#102119]/10 bg-[#f7fbf8]/86 p-4 shadow-2xl backdrop-blur dark:border-[#9ad0b0]/15 dark:bg-[#14211c]/86">
      <span className="text-xs font-extrabold uppercase tracking-wide text-[#53665c] dark:text-[#9fb1a8]">
        {title}
      </span>
      <strong className="mt-2 block text-2xl text-current">{value}</strong>
      <span className="mt-2 flex items-center gap-2 text-sm text-[#53665c] dark:text-[#c4d2cb]">
        <span className={`block size-2 rounded-full ${accent}`} />
        {detail}
      </span>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#102119]/10 bg-[#f7fbf8]/82 p-4 shadow-xl backdrop-blur dark:border-[#9ad0b0]/15 dark:bg-[#14211c]/82">
      <span className="text-xs font-extrabold uppercase tracking-wide text-[#53665c] dark:text-[#9fb1a8]">
        {label}
      </span>
      <strong className="mt-2 block text-2xl text-current">{value}</strong>
    </div>
  )
}

function UsageBar({
  color,
  label,
  value,
  width,
}: {
  color: string
  label: string
  value: string
  width: string
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#dcebe3] dark:bg-[#1b2d25]">
        <div className="h-full rounded-full" style={{ width, background: color }} />
      </div>
    </div>
  )
}

function FeatureItem({
  copy,
  icon: Icon,
  title,
}: {
  copy: string
  icon: LucideIcon
  title: string
}) {
  return (
    <article className="grid gap-3 rounded-md border border-[#cddfd4] bg-[#edf5f0] p-5 dark:border-[#9ad0b0]/15 dark:bg-[#0f1714]">
      <Icon className="size-5 text-[#1e68d7]" aria-hidden="true" />
      <h2 className="m-0 text-lg font-extrabold">{title}</h2>
      <p className="m-0 text-sm leading-6 text-[#53665c] dark:text-[#c4d2cb]">{copy}</p>
    </article>
  )
}

