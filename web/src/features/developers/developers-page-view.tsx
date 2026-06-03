import { type FormEvent, type ReactNode, useRef, useState } from "react"
import { buildDeveloperConnectionString } from "../../../../convex/developerTokens"
import { DeveloperTable } from "./developer-table"
import "./developers-page.css"
import type {
  CreateDeveloperResult,
  DeveloperMutationResult,
  DevelopersState,
  ReenableDeveloperResult,
  RevokeDeveloperTokenResult,
  RotateDeveloperTokenResult,
} from "./developers"

type ReadyDevelopersState = Extract<DevelopersState, { status: "ready" }>
type DeveloperRow = ReadyDevelopersState["developers"][number]
type DeveloperTokenAction = "rotate" | "revoke" | "reenable"

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
  onRotate: (input: {
    developerId: string
    tokenLabel: string
  }) => Promise<RotateDeveloperTokenResult>
  onRevoke: (input: { developerId: string }) => Promise<RevokeDeveloperTokenResult>
  onReenable: (input: {
    developerId: string
    tokenLabel: string
  }) => Promise<ReenableDeveloperResult>
}

export function DevelopersPageView({
  state,
  auth,
  signInSlot,
  userSlot,
  teamUrl,
  onCreate,
  onRotate,
  onRevoke,
  onReenable,
}: DevelopersPageViewProps) {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [tokenLabel, setTokenLabel] = useState("Desktop token")
  const [metadataNotes, setMetadataNotes] = useState("")
  const [mutationResult, setMutationResult] = useState<DeveloperMutationResult | null>(
    null
  )
  const [showInactive, setShowInactive] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    developerId: string
    action: DeveloperTokenAction
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const tokenActionRef = useRef(false)

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
    setMutationResult(result)
    submittingRef.current = false
    setIsSubmitting(false)

    if (result.ok) {
      setDisplayName("")
      setEmail("")
      setTokenLabel("Desktop token")
      setMetadataNotes("")
    }
  }

  async function handleTokenAction(action: DeveloperTokenAction, developer: DeveloperRow) {
    if (tokenActionRef.current) return

    tokenActionRef.current = true
    setPendingAction({ developerId: developer.id, action })
    const nextTokenLabel = developer.token?.label ?? "Desktop token"
    const result =
      action === "rotate"
        ? await onRotate({ developerId: developer.id, tokenLabel: nextTokenLabel })
        : action === "reenable"
          ? await onReenable({ developerId: developer.id, tokenLabel: nextTokenLabel })
          : await onRevoke({ developerId: developer.id })

    setMutationResult(result)
    tokenActionRef.current = false
    setPendingAction(null)
  }

  return (
    <main className="admin-page developers-page">
      <section className="setup-hero developers-hero" aria-labelledby="developers-title">
        <p className="setup-eyebrow">Admin Developers</p>
        <h1 id="developers-title">Developers</h1>
        <p className="setup-copy">{pageCopy(state)}</p>
      </section>

      <section className="setup-panel setup-panel-wide developers-state-strip" aria-label="Admin state">
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
          <form className="setup-card setup-form developers-create-form" onSubmit={handleSubmit}>
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
          </form>

          {mutationResult ? (
            <DeveloperMutationMessage result={mutationResult} teamUrl={teamUrl} />
          ) : null}

          <DeveloperTable
            state={state}
            showInactive={showInactive}
            pendingAction={pendingAction}
            onShowInactiveChange={setShowInactive}
            onRotate={(developer) => handleTokenAction("rotate", developer)}
            onRevoke={(developer) => handleTokenAction("revoke", developer)}
            onReenable={(developer) => handleTokenAction("reenable", developer)}
          />
        </>
      ) : null}
    </main>
  )
}

function DeveloperMutationMessage({
  result,
  teamUrl,
}: {
  result: DeveloperMutationResult
  teamUrl: string
}) {
  if (!result.ok) {
    return (
      <div className="setup-message setup-message-error" role="alert">
        {result.message}
      </div>
    )
  }

  if (!result.rawToken) {
    return (
      <div className="setup-message" role="status">
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
