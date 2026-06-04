import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { setupStateLabel, type SetupState } from "./setup-status"

type SetupStatusViewProps = {
  state: SetupState
}

export function SetupStatusView({ state }: SetupStatusViewProps) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-3.75rem)] w-full max-w-4xl content-center gap-5 px-6 py-10 max-md:px-4 max-md:py-6">
      <section className="mx-auto w-full max-w-3xl text-center" aria-labelledby="setup-title">
        <p className="mb-3 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
          eUsage
        </p>
        <h1 id="setup-title" className="m-0 text-5xl font-extrabold leading-none text-foreground max-md:text-4xl">
          {setupStateLabel(state)}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">
          {setupStateCopy(state)}
        </p>
        {state.status === "setup-needed" ? (
          <Link className={buttonVariants({ className: "mt-3" })} to="/setup">
            Open setup
          </Link>
        ) : null}
        {state.status === "setup-complete" ? (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link className={buttonVariants()} to="/">
              Open overview
            </Link>
            <Link className={buttonVariants()} to="/developers">
              Open developers
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} to="/tv">
              Open TV
            </Link>
          </div>
        ) : null}
      </section>

      <Card className="w-full p-0">
        <CardContent className="grid grid-cols-4 gap-px p-0 max-md:grid-cols-1" aria-label="Backend state">
          <InfoCell label="Backend state" value={state.status} />
          <InfoCell label="Reason" value={state.reason ?? "team-found"} />
          <InfoCell label="Team" value={state.team?.name ?? "Missing"} />
          <InfoCell label="Owner" value={ownerLabel(state)} />
        </CardContent>
      </Card>
    </main>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 bg-card p-4">
      <span className="text-xs font-extrabold uppercase tracking-wide text-primary">{label}</span>
      <strong className="break-words text-base text-foreground">{value}</strong>
    </div>
  )
}

function ownerLabel(state: SetupState) {
  if (!state.owner) return "Missing"
  return state.owner.email ?? state.owner.name ?? state.owner.clerkUserId ?? "Configured"
}

function setupStateCopy(state: SetupState) {
  if (state.status === "setup-complete") {
    return `${state.team.name} is ready for the admin dashboard.`
  }

  if (state.status === "setup-broken") {
    return "Setup data is incomplete. Fix the Convex team/admin rows manually."
  }

  return "No team exists in Convex yet."
}
