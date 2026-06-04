import { type FormEvent, type ReactNode, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { z } from "zod"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SETUP_TEAM_NAME_MAX_LENGTH } from "../../../../convex/setupClaim"
import { PageState } from "../shell/page-state"
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

const SETUP_TOKEN_MAX_LENGTH = 256

export function SetupClaimView({
  state,
  auth,
  signInSlot,
  userSlot,
  onClaim,
}: SetupClaimViewProps) {
  const [teamName, setTeamName] = useState("eUsage Team")
  const [setupToken, setSetupToken] = useState("")
  const [formErrors, setFormErrors] = useState<SetupFormErrors>({})
  const [claimResult, setClaimResult] = useState<SetupClaimResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    const validation = setupFormSchema.safeParse({ teamName, setupToken })
    if (!validation.success) {
      setFormErrors(setupFormErrors(validation.error))
      return
    }

    setFormErrors({})
    submittingRef.current = true
    setIsSubmitting(true)
    const result = await onClaim({
      teamName: validation.data.teamName,
      setupToken: validation.data.setupToken,
      reportingTimeZone: browserReportingTimeZone(),
    })
    setClaimResult(result)
    submittingRef.current = false
    setIsSubmitting(false)
  }

  function clearFormError(field: keyof SetupFormInput) {
    if (!formErrors[field]) return
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  if (state.status === "setup-broken") {
    return (
      <PageState label="Setup error" title="Setup error" tone="error">
        <p className="m-0">Setup data is incomplete. Fix the Convex team/admin rows manually.</p>
      </PageState>
    )
  }

  if (state.status === "setup-needed" && !auth.isLoaded) {
    return (
      <PageState label="Sign-in loading" title="Loading setup...">
        <p className="m-0">Checking sign-in.</p>
      </PageState>
    )
  }

  if (state.status === "setup-needed" && !auth.isSignedIn) {
    return (
      <PageState action={signInSlot} label="Sign in" title="Sign in required">
        <p className="m-0">Sign in with Clerk before claiming this deployment.</p>
      </PageState>
    )
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-3.75rem)] w-full max-w-4xl content-center gap-5 px-6 py-10 max-md:px-4 max-md:py-6">
      <section className="mx-auto w-full max-w-3xl text-center" aria-labelledby="setup-title">
        <p className="mb-3 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
          eUsage setup
        </p>
        <h1 id="setup-title" className="m-0 text-5xl font-extrabold leading-none text-foreground max-md:text-4xl">
          {setupStateLabel(state)}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">{setupCopy(state)}</p>
      </section>

      <Card className="w-full p-0" role="region" aria-label="Setup claim">
        <CardContent className="grid grid-cols-2 gap-px p-0 max-md:grid-cols-1">
          <InfoCell label="Backend state" value={state.status} />
          <InfoCell label="Clerk user" value={auth.userLabel ?? "Signed out"} />
        </CardContent>
      </Card>

      {state.status === "setup-complete" ? (
        <Card className="w-full" role="region" aria-label="Setup complete">
          <CardContent className="grid gap-5">
            <div className="flex min-h-8 items-center justify-between gap-4 max-sm:items-start">
              <strong className="text-base text-foreground">Deployment claimed</strong>
              <div className="shrink-0">{userSlot}</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1 rounded-lg bg-muted/35 p-4">
                <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Team</span>
                <strong className="break-words text-base text-foreground">{state.team.name} is claimed.</strong>
              </div>
              <div className="grid gap-1 rounded-lg bg-muted/35 p-4">
                <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Owner</span>
                <strong className="break-words text-base text-foreground">{ownerLabel(state.owner)}</strong>
              </div>
            </div>
            <div className="flex justify-center sm:justify-end">
              <Link className={buttonVariants({ className: "w-full sm:w-fit" })} to="/">
                Open dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {state.status === "setup-needed" && auth.isSignedIn ? (
        <Card className="w-full">
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
              <div className="flex min-h-8 items-center justify-between gap-4">
                <strong className="text-base text-foreground">Claim deployment</strong>
                <div className="shrink-0">{userSlot}</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel
                  error={formErrors.teamName}
                  errorId="setup-team-name-error"
                  htmlFor="setup-team-name"
                  label="Team name"
                >
                  <Input
                    id="setup-team-name"
                    value={teamName}
                    onChange={(event) => {
                      setTeamName(event.target.value)
                      clearFormError("teamName")
                    }}
                    autoComplete="organization"
                    placeholder="eLink Design"
                    maxLength={SETUP_TEAM_NAME_MAX_LENGTH}
                    aria-invalid={Boolean(formErrors.teamName)}
                    aria-describedby={formErrors.teamName ? "setup-team-name-error" : undefined}
                  />
                </FieldLabel>
                <FieldLabel
                  error={formErrors.setupToken}
                  errorId="setup-token-error"
                  htmlFor="setup-token"
                  label="Setup token"
                >
                  <Input
                    id="setup-token"
                    value={setupToken}
                    onChange={(event) => {
                      setSetupToken(event.target.value)
                      clearFormError("setupToken")
                    }}
                    type="password"
                    autoComplete="one-time-code"
                    placeholder="Paste setup token"
                    maxLength={SETUP_TOKEN_MAX_LENGTH}
                    aria-invalid={Boolean(formErrors.setupToken)}
                    aria-describedby={formErrors.setupToken ? "setup-token-error" : undefined}
                  />
                </FieldLabel>
              </div>
              <div className="flex justify-center sm:justify-end">
                <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Claiming..." : "Claim deployment"}
                </Button>
              </div>
              {claimResult ? <SetupClaimMessage result={claimResult} /> : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}

function SetupClaimMessage({ result }: { result: SetupClaimResult }) {
  if (result.ok) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-primary" role="status">
        <p className="mb-2 mt-0">{result.message}</p>
        <Link to="/">Open dashboard</Link>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive" role="alert">
      {result.message}
    </div>
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

const setupFormSchema = z.object({
  teamName: z.string().trim().min(1, "Team name is required.").max(SETUP_TEAM_NAME_MAX_LENGTH, "Use 80 characters or fewer."),
  setupToken: z.string().trim().min(1, "Setup token is required.").max(SETUP_TOKEN_MAX_LENGTH, "Use 256 characters or fewer."),
})

type SetupFormInput = z.infer<typeof setupFormSchema>
type SetupFormErrors = Partial<Record<keyof SetupFormInput, string>>

function setupFormErrors(error: z.ZodError<SetupFormInput>) {
  const errors: SetupFormErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (field === "teamName" || field === "setupToken") {
      errors[field] ??= issue.message
    }
  }
  return errors
}

function FieldLabel({
  children,
  error,
  errorId,
  htmlFor,
  label,
}: {
  children: ReactNode
  error?: string
  errorId: string
  htmlFor: string
  label: string
}) {
  return (
    <label className="grid gap-2" htmlFor={htmlFor}>
      <span className="text-xs font-extrabold uppercase tracking-wide text-primary">{label}</span>
      {children}
      {error ? (
        <span id={errorId} className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
