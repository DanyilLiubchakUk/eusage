import { CalendarPlus, Clock3, Laptop, RotateCcw, ShieldCheck, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DevelopersState } from "./developers"

type ReadyDevelopersState = Extract<DevelopersState, { status: "ready" }>
type DeveloperRow = ReadyDevelopersState["developers"][number]
type DeveloperTableStatus =
  | DeveloperRow["status"]
  | NonNullable<DeveloperRow["token"]>["status"]
  | DeveloperRow["devices"][number]["status"]
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
      <Card role="region" aria-label="Developers">
        <CardContent>
          <p className="m-0 text-muted-foreground">No developers yet.</p>
        </CardContent>
      </Card>
    )
  }

  const inactiveCount = state.developers.filter(
    (developer) => developer.status === "inactive"
  ).length
  const visibleDevelopers = showInactive
    ? state.developers
    : state.developers.filter((developer) => developer.status === "active")

  return (
    <Card role="region" aria-label="Developers">
      <CardContent className="grid gap-4">
        <div className="flex items-start justify-between gap-4 max-md:grid">
          <div className="grid gap-1">
            <strong className="text-base text-foreground">Developer access</strong>
            <span className="text-sm text-muted-foreground">
              {visibleDevelopers.length} shown · {state.developers.length} total
            </span>
          </div>
          {inactiveCount > 0 ? (
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <input
                className="size-4 accent-primary"
                checked={showInactive}
                onChange={(event) => onShowInactiveChange(event.target.checked)}
                type="checkbox"
              />
              Show inactive developers ({inactiveCount})
            </label>
          ) : null}
        </div>

        {visibleDevelopers.length === 0 ? (
          <p className="m-0 text-muted-foreground">No active developers.</p>
        ) : (
          <div className="grid gap-3">
            {visibleDevelopers.map((developer) => (
              <article
                key={developer.id}
                className="overflow-hidden rounded-lg border border-border/70 bg-muted/25"
              >
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(14rem,1.2fr)_minmax(12rem,0.9fr)_minmax(13rem,0.85fr)_auto] lg:items-start">
                  <DeveloperIdentity developer={developer} />
                  <DeveloperToken developer={developer} />
                  <DeveloperActivity developer={developer} />
                  <TokenActions
                    developer={developer}
                    pendingAction={pendingAction}
                    onRotate={onRotate}
                    onRevoke={onRevoke}
                    onReenable={onReenable}
                  />
                </div>

                {developer.metadata?.notes ? (
                  <div className="border-t border-border/60 px-4 py-3">
                    <p className="m-0 max-h-24 overflow-y-auto rounded-md bg-background/65 px-3 py-2 text-sm leading-6 text-muted-foreground">
                      {developer.metadata.notes}
                    </p>
                  </div>
                ) : null}

                <DeviceSummary developer={developer} />
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeveloperIdentity({ developer }: { developer: DeveloperRow }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black uppercase text-primary">
        {developerInitials(developer.displayName)}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="break-words text-base text-foreground">{developer.displayName}</strong>
          <StatusBadge status={developer.status} />
        </div>
        <span className="mt-1 block break-words text-sm text-muted-foreground">
          {developer.email ?? "No email"}
        </span>
      </div>
    </div>
  )
}

function DeveloperToken({ developer }: { developer: DeveloperRow }) {
  if (!developer.token) {
    return (
      <div className="grid gap-2">
        <span className="text-sm text-muted-foreground">Missing token</span>
      </div>
    )
  }

  return (
    <div className="grid min-w-0 gap-2">
      <code className="w-fit max-w-full break-all rounded-md bg-background/80 px-2 py-1 font-mono text-sm text-foreground">
        {developer.token.fingerprint}
      </code>
      <div className="flex flex-wrap items-center gap-2">
        <span className="max-w-full truncate rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-primary" title={developer.token.label}>
          {developer.token.label}
        </span>
        <StatusBadge status={developer.token.status} />
      </div>
    </div>
  )
}

function DeveloperActivity({ developer }: { developer: DeveloperRow }) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Activity</span>
      <div className="flex flex-wrap gap-2">
        <TimePill label="Created" timestamp={developer.createdAt} icon="created" />
        <TimePill label="Last seen" timestamp={developer.lastSeenAt} icon="lastSeen" />
      </div>
    </div>
  )
}

function TimePill({
  icon,
  label,
  timestamp,
}: {
  icon: "created" | "lastSeen"
  label: string
  timestamp: number | null
}) {
  const Icon = icon === "created" ? CalendarPlus : Clock3
  const time = formatShortTimestamp(timestamp)

  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-sm text-muted-foreground"
      title={`${label}: ${formatTimestamp(timestamp)}`}
      aria-label={`${label}: ${formatTimestamp(timestamp)}`}
    >
      <Icon size={14} aria-hidden="true" />
      {time}
    </span>
  )
}

function DeviceSummary({ developer }: { developer: DeveloperRow }) {
  if (developer.devices.length === 0) {
    return (
      <div className="border-t border-border/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">No devices</span>
      </div>
    )
  }

  return (
    <section className="border-t border-border/60 px-4 py-3" aria-label={`Devices for ${developer.displayName}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
          <Laptop size={14} aria-hidden="true" />
          Devices
        </span>
        <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-bold text-muted-foreground">
          {developer.devices.length} {developer.devices.length === 1 ? "device" : "devices"}
        </span>
      </div>
      <ul className="m-0 grid max-h-40 list-none gap-2 overflow-y-auto p-0 pr-1 md:grid-cols-2 xl:grid-cols-3">
        {developer.devices.map((device) => (
          <li
            key={device.id}
            className="grid min-w-0 gap-1 rounded-md border border-border/70 bg-background/70 p-3"
            title={`Last seen ${formatTimestamp(device.lastSeenAt)}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <strong className="truncate text-sm text-foreground">{device.deviceName}</strong>
              <StatusBadge status={device.status} />
            </div>
            <span className="truncate text-sm text-muted-foreground">
              {device.status} - {device.os} - v{device.appVersion}
            </span>
            <span className="text-xs text-muted-foreground">Seen {formatShortTimestamp(device.lastSeenAt)}</span>
            <span className="sr-only">Last seen {formatTimestamp(device.lastSeenAt)}</span>
          </li>
        ))}
      </ul>
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
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onReenable(developer)}
        type="button"
      >
        <ShieldCheck aria-hidden="true" />
        {isPending && pendingAction?.action === "reenable"
          ? "Re-enabling..."
          : "Re-enable"}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 lg:grid lg:justify-items-start">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onRotate(developer)}
        type="button"
      >
        <RotateCcw aria-hidden="true" />
        {isPending && pendingAction?.action === "rotate" ? "Rotating..." : "Rotate"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => onRevoke(developer)}
        type="button"
      >
        <ShieldOff aria-hidden="true" />
        {isPending && pendingAction?.action === "revoke" ? "Revoking..." : "Revoke"}
      </Button>
    </div>
  )
}

function StatusBadge({ status }: { status: DeveloperTableStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-extrabold capitalize",
        status === "active" || status === "connected"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  )
}

function developerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
}

function formatTimestamp(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toISOString() : "Never"
}

function formatShortTimestamp(timestamp: number | null) {
  if (!timestamp) return "Never"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp))
}
