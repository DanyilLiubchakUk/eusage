import type { DevelopersState } from "./developers"

type ReadyDevelopersState = Extract<DevelopersState, { status: "ready" }>
type DeveloperRow = ReadyDevelopersState["developers"][number]
type DeveloperTokenAction = "rotate" | "revoke" | "reenable"

type DeveloperTableProps = {
  state: ReadyDevelopersState
  showInactive: boolean
  pendingAction: {
    developerId: string
    action: DeveloperTokenAction
  } | null
  onShowInactiveChange: (showInactive: boolean) => void
  onRotate: (developer: DeveloperRow) => void
  onRevoke: (developer: DeveloperRow) => void
  onReenable: (developer: DeveloperRow) => void
}

export function DeveloperTable({
  state,
  showInactive,
  pendingAction,
  onShowInactiveChange,
  onRotate,
  onRevoke,
  onReenable,
}: DeveloperTableProps) {
  if (state.developers.length === 0) {
    return (
      <section className="setup-card" aria-label="Developers">
        <p>No developers yet.</p>
      </section>
    )
  }

  const inactiveCount = state.developers.filter(
    (developer) => developer.status === "inactive"
  ).length
  const visibleDevelopers = showInactive
    ? state.developers
    : state.developers.filter((developer) => developer.status === "active")

  return (
    <section className="setup-card developer-table-card" aria-label="Developers">
      <div className="developer-table-toolbar">
        <strong>Developer access</strong>
        {inactiveCount > 0 ? (
          <label className="developer-review-control">
            <input
              checked={showInactive}
              onChange={(event) => onShowInactiveChange(event.target.checked)}
              type="checkbox"
            />
            Show inactive developers ({inactiveCount})
          </label>
        ) : null}
      </div>

      {visibleDevelopers.length === 0 ? (
        <p>No active developers.</p>
      ) : (
        <table className="developer-table">
          <thead>
            <tr>
              <th>Developer</th>
              <th>Status</th>
              <th>Token</th>
              <th>Created</th>
              <th>Last seen</th>
              <th>Metadata</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleDevelopers.map((developer) => (
              <tr key={developer.id}>
                <td>
                  <strong>{developer.displayName}</strong>
                  <span>{developer.email ?? "No email"}</span>
                </td>
                <td>{developer.status}</td>
                <td>
                  <strong>{developer.token?.fingerprint ?? "Missing"}</strong>
                  <span>{tokenSummary(developer)}</span>
                </td>
                <td>{formatTimestamp(developer.createdAt)}</td>
                <td>{formatTimestamp(developer.lastSeenAt)}</td>
                <td>{developer.metadata?.notes ?? "None"}</td>
                <td>
                  <TokenActions
                    developer={developer}
                    pendingAction={pendingAction}
                    onRotate={onRotate}
                    onRevoke={onRevoke}
                    onReenable={onReenable}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function TokenActions({
  developer,
  pendingAction,
  onRotate,
  onRevoke,
  onReenable,
}: {
  developer: DeveloperRow
  pendingAction: DeveloperTableProps["pendingAction"]
  onRotate: (developer: DeveloperRow) => void
  onRevoke: (developer: DeveloperRow) => void
  onReenable: (developer: DeveloperRow) => void
}) {
  const isPending = pendingAction?.developerId === developer.id

  if (developer.status === "inactive") {
    return (
      <button
        className="setup-button setup-button-secondary"
        disabled={isPending}
        onClick={() => onReenable(developer)}
        type="button"
      >
        {isPending && pendingAction?.action === "reenable"
          ? "Re-enabling..."
          : "Re-enable"}
      </button>
    )
  }

  return (
    <div className="developer-action-buttons">
      <button
        className="setup-button setup-button-secondary"
        disabled={isPending}
        onClick={() => onRotate(developer)}
        type="button"
      >
        {isPending && pendingAction?.action === "rotate" ? "Rotating..." : "Rotate"}
      </button>
      <button
        className="setup-button setup-button-danger"
        disabled={isPending}
        onClick={() => onRevoke(developer)}
        type="button"
      >
        {isPending && pendingAction?.action === "revoke" ? "Revoking..." : "Revoke"}
      </button>
    </div>
  )
}

function tokenSummary(developer: DeveloperRow) {
  if (!developer.token) return "No token"
  return `${developer.token.label} (${developer.token.status})`
}

function formatTimestamp(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toISOString() : "Never"
}
