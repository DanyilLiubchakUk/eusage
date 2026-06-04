import { type FormEvent, type ReactNode, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  setupStateLabel,
  type SetupClaimResult,
  type SetupState,
} from "./setup-status"

type SetupClaimViewProps = {
  state: SetupState
  auth: {
    isLoaded: boolean
    isSignedIn: boolean
    userLabel: string | null
  }
  signInSlot: ReactNode
  userSlot: ReactNode
  onClaim: (input: {
    teamName: string
    setupToken: string
    reportingTimeZone: string
  }) => Promise<SetupClaimResult>
}

export function SetupClaimView({
  state,
  auth,
  signInSlot,
  userSlot,
  onClaim,
}: SetupClaimViewProps) {
  const [teamName, setTeamName] = useState("eUsage Team")
  const [setupToken, setSetupToken] = useState("")
  const [claimResult, setClaimResult] = useState<SetupClaimResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    submittingRef.current = true
    setIsSubmitting(true)
    const result = await onClaim({
      teamName,
      setupToken,
      reportingTimeZone: browserReportingTimeZone(),
    })
    setClaimResult(result)
    submittingRef.current = false
    setIsSubmitting(false)
  }

  return (
    <main className="setup-page">
      <section className="setup-hero" aria-labelledby="setup-title">
        <p className="setup-eyebrow">eUsage setup</p>
        <h1 id="setup-title">{setupStateLabel(state)}</h1>
        <p className="setup-copy">{setupCopy(state)}</p>
      </section>

      <section className="setup-panel setup-panel-wide" aria-label="Setup claim">
        <div>
          <span className="setup-label">Backend state</span>
          <strong>{state.status}</strong>
        </div>
        <div>
          <span className="setup-label">Clerk user</span>
          <strong>{auth.userLabel ?? "Signed out"}</strong>
        </div>
      </section>

      {state.status === "setup-complete" ? (
        <section className="setup-card" aria-label="Setup complete">
          <p>{state.team.name} is claimed.</p>
          <p>Owner: {ownerLabel(state.owner)}</p>
          <Link className="setup-button" to="/">
            Open dashboard
          </Link>
        </section>
      ) : null}

      {state.status === "setup-broken" ? (
        <section className="setup-card setup-card-error" aria-label="Setup error">
          <p>Setup data is incomplete. Fix the Convex team/admin rows manually.</p>
        </section>
      ) : null}

      {state.status === "setup-needed" && !auth.isLoaded ? (
        <section className="setup-card" aria-label="Sign-in loading">
          <p>Checking sign-in...</p>
        </section>
      ) : null}

      {state.status === "setup-needed" && auth.isLoaded && !auth.isSignedIn ? (
        <section className="setup-card" aria-label="Sign in">
          <p>Sign in with Clerk before claiming this deployment.</p>
          {signInSlot}
        </section>
      ) : null}

      {state.status === "setup-needed" && auth.isSignedIn ? (
        <form className="setup-card setup-form" onSubmit={handleSubmit}>
          <div className="setup-user-row">{userSlot}</div>
          <label>
            <span className="setup-label">Team name</span>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              autoComplete="organization"
            />
          </label>
          <label>
            <span className="setup-label">Setup token</span>
            <input
              value={setupToken}
              onChange={(event) => setSetupToken(event.target.value)}
              type="password"
              autoComplete="one-time-code"
            />
          </label>
          <button className="setup-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Claiming..." : "Claim deployment"}
          </button>
          {claimResult ? <SetupClaimMessage result={claimResult} /> : null}
        </form>
      ) : null}
    </main>
  )
}

function SetupClaimMessage({ result }: { result: SetupClaimResult }) {
  if (result.ok) {
    return (
      <div className="setup-message" role="status">
        <p>{result.message}</p>
        <Link to="/">Open dashboard</Link>
      </div>
    )
  }

  return (
    <div className="setup-message setup-message-error" role="alert">
      {result.message}
    </div>
  )
}

function ownerLabel(owner: SetupState["owner"]) {
  return owner?.email ?? owner?.name ?? owner?.clerkUserId ?? "Configured"
}

function setupCopy(state: SetupState) {
  if (state.status === "setup-complete") {
    return "The setup token is sealed for this deployment."
  }

  if (state.status === "setup-broken") {
    return "Setup cannot continue until the stored team and owner rows are consistent."
  }

  return "Enter the deploy-time setup token to create the first owner."
}

function browserReportingTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}
