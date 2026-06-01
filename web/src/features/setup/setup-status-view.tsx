import { setupStateLabel, type SetupState } from "./setup-status"

type SetupStatusViewProps = {
  state: SetupState
}

export function SetupStatusView({ state }: SetupStatusViewProps) {
  const isReady = state.status === "setup-complete"

  return (
    <main className="setup-page">
      <section className="setup-hero" aria-labelledby="setup-title">
        <p className="setup-eyebrow">eUsage</p>
        <h1 id="setup-title">{setupStateLabel(state)}</h1>
        <p className="setup-copy">
          {isReady
            ? `${state.team.name} is ready for the admin dashboard.`
            : "No team exists in Convex yet."}
        </p>
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
      </section>
    </main>
  )
}
