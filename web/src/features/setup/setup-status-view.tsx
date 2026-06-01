import { Link } from "@tanstack/react-router"
import { setupStateLabel, type SetupState } from "./setup-status"

type SetupStatusViewProps = {
  state: SetupState
}

export function SetupStatusView({ state }: SetupStatusViewProps) {
  return (
    <main className="setup-page">
      <section className="setup-hero" aria-labelledby="setup-title">
        <p className="setup-eyebrow">eUsage</p>
        <h1 id="setup-title">{setupStateLabel(state)}</h1>
        <p className="setup-copy">
          {setupStateCopy(state)}
        </p>
        {state.status === "setup-needed" ? (
          <Link className="setup-button" to="/setup">
            Open setup
          </Link>
        ) : null}
        {state.status === "setup-complete" ? (
          <Link className="setup-button" to="/setup">
            View setup status
          </Link>
        ) : null}
      </section>

      <section className="setup-panel" aria-label="Backend state">
        <div>
          <span className="setup-label">Backend state</span>
          <strong>{state.status}</strong>
        </div>
        <div>
          <span className="setup-label">Reason</span>
          <strong>{state.reason ?? "team-found"}</strong>
        </div>
        <div>
          <span className="setup-label">Team</span>
          <strong>{state.team?.name ?? "Missing"}</strong>
        </div>
        <div>
          <span className="setup-label">Owner</span>
          <strong>{ownerLabel(state)}</strong>
        </div>
      </section>
    </main>
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
