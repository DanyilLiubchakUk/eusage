import { type FormEvent, type ReactNode, useRef, useState } from "react"
import { buildDeveloperConnectionString } from "../../../../convex/developerTokens"
import type { CreateDeveloperResult, DevelopersState } from "./developers"

type DevelopersPageViewProps = {
  state: DevelopersState
  auth: {
    isLoaded: boolean
    isSignedIn: boolean
    userLabel: string | null
  }
  signInSlot: ReactNode
  userSlot: ReactNode
  teamUrl: string
  onCreate: (input: {
    displayName: string
    email?: string
    tokenLabel: string
    metadataNotes?: string
  }) => Promise<CreateDeveloperResult>
}

export function DevelopersPageView({
  state,
  auth,
  signInSlot,
  userSlot,
  teamUrl,
  onCreate,
}: DevelopersPageViewProps) {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [tokenLabel, setTokenLabel] = useState("Desktop token")
  const [metadataNotes, setMetadataNotes] = useState("")
  const [createResult, setCreateResult] = useState<CreateDeveloperResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    submittingRef.current = true
    setIsSubmitting(true)
    const result = await onCreate({
      displayName,
      email: email || undefined,
      tokenLabel,
      metadataNotes: metadataNotes || undefined,
    })
    setCreateResult(result)
    submittingRef.current = false
    setIsSubmitting(false)

    if (result.ok) {
      setDisplayName("")
      setEmail("")
      setTokenLabel("Desktop token")
      setMetadataNotes("")
    }
  }

  return (
    <main className="admin-page">
      <section className="setup-hero" aria-labelledby="developers-title">
        <p className="setup-eyebrow">Admin Developers</p>
        <h1 id="developers-title">Developers</h1>
        <p className="setup-copy">{pageCopy(state)}</p>
      </section>

      <section className="setup-panel setup-panel-wide" aria-label="Admin state">
        <div>
          <span className="setup-label">Backend state</span>
          <strong>{state.status}</strong>
        </div>
        <div>
          <span className="setup-label">Clerk user</span>
          <strong>{auth.userLabel ?? "Signed out"}</strong>
        </div>
      </section>

      {!auth.isLoaded ? (
        <section className="setup-card" aria-label="Sign-in loading">
          <p>Checking sign-in...</p>
        </section>
      ) : null}

      {auth.isLoaded && !auth.isSignedIn ? (
        <section className="setup-card" aria-label="Sign in">
          <p>Sign in with Clerk before managing developers.</p>
          {signInSlot}
        </section>
      ) : null}

      {state.status === "not-owner" ? (
        <section className="setup-card setup-card-error" role="alert">
          <p>Only the setup owner can manage developers.</p>
        </section>
      ) : null}

      {state.status === "setup-state-invalid" ? (
        <section className="setup-card setup-card-error" role="alert">
          <p>Setup must be complete before developers can be created.</p>
        </section>
      ) : null}

      {state.status === "ready" && auth.isLoaded && auth.isSignedIn ? (
        <>
          <form className="setup-card setup-form" onSubmit={handleSubmit}>
            <div className="setup-user-row">{userSlot}</div>
            <label>
              <span className="setup-label">Developer name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              <span className="setup-label">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
              />
            </label>
            <label>
              <span className="setup-label">Token label</span>
              <input
                value={tokenLabel}
                onChange={(event) => setTokenLabel(event.target.value)}
              />
            </label>
            <label>
              <span className="setup-label">Metadata</span>
              <textarea
                value={metadataNotes}
                onChange={(event) => setMetadataNotes(event.target.value)}
                rows={3}
              />
            </label>
            <button className="setup-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating..." : "Create developer"}
            </button>
            {createResult ? (
              <CreateDeveloperMessage result={createResult} teamUrl={teamUrl} />
            ) : null}
          </form>

          <DeveloperTable state={state} />
        </>
      ) : null}
    </main>
  )
}

function CreateDeveloperMessage({
  result,
  teamUrl,
}: {
  result: CreateDeveloperResult
  teamUrl: string
}) {
  if (!result.ok) {
    return (
      <div className="setup-message setup-message-error" role="alert">
        {result.message}
      </div>
    )
  }

  const connectionString = buildDeveloperConnectionString({
    teamUrl,
    rawToken: result.rawToken,
  })

  return (
    <div className="setup-message developer-secret" role="status">
      <p>{result.message}</p>
      <span className="setup-label">Raw token</span>
      <code>{result.rawToken}</code>
      <span className="setup-label">Connection string</span>
      <code>{connectionString}</code>
      <p>Shown once. Copy before leaving this page.</p>
    </div>
  )
}

function DeveloperTable({ state }: { state: Extract<DevelopersState, { status: "ready" }> }) {
  if (state.developers.length === 0) {
    return (
      <section className="setup-card" aria-label="Developers">
        <p>No developers yet.</p>
      </section>
    )
  }

  return (
    <section className="setup-card developer-table-card" aria-label="Developers">
      <table className="developer-table">
        <thead>
          <tr>
            <th>Developer</th>
            <th>Status</th>
            <th>Token</th>
            <th>Created</th>
            <th>Last seen</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {state.developers.map((developer) => (
            <tr key={developer.id}>
              <td>
                <strong>{developer.displayName}</strong>
                <span>{developer.email ?? "No email"}</span>
              </td>
              <td>{developer.status}</td>
              <td>
                <strong>{developer.token?.fingerprint ?? "Missing"}</strong>
                <span>{developer.token?.label ?? "No token"}</span>
              </td>
              <td>{formatTimestamp(developer.createdAt)}</td>
              <td>{formatTimestamp(developer.lastSeenAt)}</td>
              <td>{developer.metadata?.notes ?? "None"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function pageCopy(state: DevelopersState) {
  if (state.status === "ready") {
    return `${state.team.name} developer tokens and connection strings.`
  }

  if (state.status === "not-owner") {
    return "This page is owner-only."
  }

  if (state.status === "not-authenticated") {
    return "Sign in to manage developer tokens."
  }

  return "Setup is not complete."
}

function formatTimestamp(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toISOString() : "Never"
}
