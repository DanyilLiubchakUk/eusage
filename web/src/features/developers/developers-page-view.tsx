import { type FormEvent, type ReactNode, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { buildDeveloperConnectionString } from "../../../../convex/developerTokens"
import { PageState } from "../shell/page-state"
import {
  developerFormErrors,
  developerFormSchema,
  DEVELOPER_EMAIL_MAX_LENGTH,
  DEVELOPER_METADATA_NOTES_MAX_LENGTH,
  DEVELOPER_NAME_MAX_LENGTH,
  DEVELOPER_TOKEN_LABEL_MAX_LENGTH,
  type DeveloperFormErrors,
  type DeveloperFormInput,
} from "./developer-form-validation"
import { DeveloperTable } from "./developer-table"
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
  }
  signInSlot: ReactNode
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
  const [formErrors, setFormErrors] = useState<DeveloperFormErrors>({})
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

    const validation = developerFormSchema.safeParse({
      displayName,
      email,
      tokenLabel,
      metadataNotes,
    })
    if (!validation.success) {
      setFormErrors(developerFormErrors(validation.error))
      return
    }

    setFormErrors({})
    submittingRef.current = true
    setIsSubmitting(true)
    const result = await onCreate({
      displayName: validation.data.displayName,
      email: validation.data.email || undefined,
      tokenLabel: validation.data.tokenLabel,
      metadataNotes: validation.data.metadataNotes || undefined,
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

  function clearFormError(field: keyof DeveloperFormInput) {
    if (!formErrors[field]) return
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  if (!auth.isLoaded) {
    return (
      <PageState label="Sign-in loading" title="Loading developers...">
        <p className="m-0">Checking sign-in.</p>
      </PageState>
    )
  }

  if (!auth.isSignedIn) {
    return (
      <PageState action={signInSlot} label="Sign in" title="Sign in required">
        <p className="m-0">Sign in with Clerk before managing developers.</p>
      </PageState>
    )
  }

  if (state.status === "not-owner") {
    return (
      <PageState label="Developers unavailable" title="Developers unavailable" tone="error">
        <p className="m-0">Only the setup owner can manage developers.</p>
      </PageState>
    )
  }

  if (state.status !== "ready") {
    return (
      <PageState label="Developers unavailable" title="Developers unavailable" tone="error">
        <p className="m-0">{pageCopy(state)}</p>
      </PageState>
    )
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-8 pb-12 max-md:px-4">
      <section className="w-full max-w-3xl" aria-labelledby="developers-title">
        <p className="mb-3 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
          Admin Developers
        </p>
        <h1 id="developers-title" className="m-0 text-5xl font-extrabold leading-none text-foreground max-md:text-4xl">
          Developers
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">{pageCopy(state)}</p>
      </section>

      <Card className="w-full">
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
            <div className="flex min-h-8 items-center justify-between gap-4">
              <strong className="text-base text-foreground">Create developer</strong>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
              <div className="flex h-full min-w-0 flex-col gap-4">
                <FieldLabel
                  error={formErrors.displayName}
                  errorId="developer-name-error"
                  htmlFor="developer-name"
                  label="Developer name"
                >
                  <Input
                    id="developer-name"
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value)
                      clearFormError("displayName")
                    }}
                    autoComplete="name"
                    placeholder="Avery Johnson"
                    maxLength={DEVELOPER_NAME_MAX_LENGTH}
                    aria-invalid={Boolean(formErrors.displayName)}
                    aria-describedby={formErrors.displayName ? "developer-name-error" : undefined}
                  />
                </FieldLabel>
                <FieldLabel
                  error={formErrors.email}
                  errorId="developer-email-error"
                  htmlFor="developer-email"
                  label="Email"
                >
                  <Input
                    id="developer-email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      clearFormError("email")
                    }}
                    type="email"
                    autoComplete="email"
                    placeholder="avery@company.com"
                    maxLength={DEVELOPER_EMAIL_MAX_LENGTH}
                    aria-invalid={Boolean(formErrors.email)}
                    aria-describedby={formErrors.email ? "developer-email-error" : undefined}
                  />
                </FieldLabel>
                <FieldLabel
                  error={formErrors.tokenLabel}
                  errorId="developer-token-label-error"
                  htmlFor="developer-token-label"
                  label="Token label"
                >
                  <Input
                    id="developer-token-label"
                    value={tokenLabel}
                    onChange={(event) => {
                      setTokenLabel(event.target.value)
                      clearFormError("tokenLabel")
                    }}
                    placeholder="Avery MacBook"
                    maxLength={DEVELOPER_TOKEN_LABEL_MAX_LENGTH}
                    aria-invalid={Boolean(formErrors.tokenLabel)}
                    aria-describedby={formErrors.tokenLabel ? "developer-token-label-error" : undefined}
                  />
                </FieldLabel>
              </div>
              <FieldLabel
                className="flex min-h-0 flex-col lg:h-full"
                error={formErrors.metadataNotes}
                errorId="developer-metadata-error"
                htmlFor="developer-metadata"
                label="Metadata"
              >
                <Textarea
                  id="developer-metadata"
                  className="field-sizing-fixed min-h-40 max-h-48 resize-y overflow-y-auto [field-sizing:fixed] lg:h-full lg:min-h-0 lg:max-h-none lg:flex-1 lg:resize-none"
                  value={metadataNotes}
                  onChange={(event) => {
                    setMetadataNotes(event.target.value)
                    clearFormError("metadataNotes")
                  }}
                  placeholder="Team, device notes, or internal owner context"
                  rows={6}
                  maxLength={DEVELOPER_METADATA_NOTES_MAX_LENGTH}
                  aria-invalid={Boolean(formErrors.metadataNotes)}
                  aria-describedby={formErrors.metadataNotes ? "developer-metadata-error" : undefined}
                />
              </FieldLabel>
            </div>
            <div className="flex justify-end">
              <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create developer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive" role="alert">
        {result.message}
      </div>
    )
  }

  if (!result.rawToken) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-primary" role="status">
        {result.message}
      </div>
    )
  }

  const connectionString = buildDeveloperConnectionString({
    teamUrl,
    rawToken: result.rawToken,
  })

  return (
    <div className="grid gap-3 rounded-md border border-primary/30 bg-primary/10 p-4 text-primary" role="status">
      <p className="m-0">{result.message}</p>
      <span className="text-xs font-extrabold uppercase tracking-wide">Raw token</span>
      <code className="block break-words rounded-md bg-background/70 p-3 font-mono text-sm text-foreground">{result.rawToken}</code>
      <span className="text-xs font-extrabold uppercase tracking-wide">Connection string</span>
      <code className="block break-words rounded-md bg-background/70 p-3 font-mono text-sm text-foreground">{connectionString}</code>
      <p className="m-0">Shown once. Copy before leaving this page.</p>
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

function FieldLabel({
  children,
  className,
  error,
  errorId,
  htmlFor,
  label,
}: {
  children: ReactNode
  className?: string
  error?: string
  errorId: string
  htmlFor: string
  label: string
}) {
  return (
    <label className={cn("grid gap-2", className)} htmlFor={htmlFor}>
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
