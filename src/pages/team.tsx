import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Save,
  Unplug,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DisplayPluginState } from "@/hooks/app/use-app-plugin-views"
import { useTeamConnection } from "@/hooks/app/use-team-connection"
import type { TeamConnectionSettings } from "@/lib/team-settings"
import { cn } from "@/lib/utils"
import { TeamConnectionForm } from "@/pages/team-connection-form"
import {
  DEVICE_NAME_FORM_MAX_LENGTH,
  teamDeviceNameFormSchema,
  teamFormError,
} from "@/pages/team-form-validation"

type TeamPageProps = {
  plugins: DisplayPluginState[]
  onConnected?: () => void
}

export function TeamPage({ plugins, onConnected }: TeamPageProps) {
  const { state, connect, checkIn, disconnect, updateDeviceName } = useTeamConnection()
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const providerSummary = useProviderSummary(plugins)
  const busy =
    state.status === "connecting" ||
    state.status === "disconnecting" ||
    state.status === "checking" ||
    state.status === "loading"

  const handleConnect = async (connectionString: string) => {
    const result = await connect(connectionString)
    if (result.ok) {
      onConnected?.()
    }
    return result.ok
  }

  const handleDisconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true)
      return
    }
    await disconnect()
    setConfirmDisconnect(false)
  }

  return (
    <div className="py-3 space-y-4">
      <header className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-lg font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">
            {state.connection ? state.connection.teamName : "No team connected"}
          </p>
        </div>
        <TeamStatusIndicators
          connection={state.connection}
          status={state.status}
          message={state.message}
        />
      </header>

      {state.connection ? (
        <ConnectedTeamPanel
          connection={state.connection}
          busy={busy}
          confirmDisconnect={confirmDisconnect}
          providerSummary={providerSummary}
          onCheckIn={checkIn}
          onUpdateDeviceName={updateDeviceName}
          onDisconnect={handleDisconnect}
          onCancelDisconnect={() => setConfirmDisconnect(false)}
        />
      ) : state.status === "loading" ? (
        <section className="rounded-md border bg-input/30 p-3 text-sm text-muted-foreground">
          Loading team connection...
        </section>
      ) : (
        <TeamConnectionForm
          busy={busy}
          statusSlot={<StatusMessage status={state.status} message={state.message} />}
          onConnect={handleConnect}
        />
      )}
    </div>
  )
}

function ConnectedTeamPanel({
  connection,
  busy,
  confirmDisconnect,
  providerSummary,
  onCheckIn,
  onUpdateDeviceName,
  onDisconnect,
  onCancelDisconnect,
}: {
  connection: TeamConnectionSettings
  busy: boolean
  confirmDisconnect: boolean
  providerSummary: ProviderSummary
  onCheckIn: () => void
  onUpdateDeviceName: (deviceNameOverride: string | null) => Promise<unknown>
  onDisconnect: () => void
  onCancelDisconnect: () => void
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="Team URL" value={connection.teamUrl} wide />
          <InfoRow label="Token" value={connection.tokenFingerprint} />
          <InfoRow label="Device ID" value={shortId(connection.deviceId)} />
        </div>
      </section>

      <DeviceNameEditor
        connection={connection}
        busy={busy}
        onUpdateDeviceName={onUpdateDeviceName}
      />

      <section className="rounded-md border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold tracking-normal">Providers</h2>
            <p className="text-xs text-muted-foreground">
              {providerSummary.ready} ready, {providerSummary.loading} loading,{" "}
              {providerSummary.errors} need setup
            </p>
          </div>
          <Badge variant="outline">{providerSummary.total} total</Badge>
        </div>
      </section>

      <div className="flex items-center justify-between gap-2 mb-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCheckIn}>
          <RefreshCw className="size-4" />
          Check in
        </Button>
        <div className="flex items-center gap-2">
          {confirmDisconnect ? (
            <Button type="button" size="sm" variant="ghost" onClick={onCancelDisconnect}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={onDisconnect}
          >
            <Unplug className="size-4" />
            {confirmDisconnect ? "Confirm" : "Disconnect"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
        <span className="font-semibold">Last contact: </span>
        <span className="truncate text-right">
          {formatLastContact(connection.lastContactAt)}
        </span>
      </div>
    </div>
  )
}

function DeviceNameEditor({
  connection,
  busy,
  onUpdateDeviceName,
}: {
  connection: TeamConnectionSettings
  busy: boolean
  onUpdateDeviceName: (deviceNameOverride: string | null) => Promise<unknown>
}) {
  const [deviceName, setDeviceName] = useState(connection.deviceName)
  const [formError, setFormError] = useState<string | null>(null)
  const errorId = "team-device-name-error"

  useEffect(() => {
    setDeviceName(connection.deviceName)
    setFormError(null)
  }, [connection.deviceName])

  const trimmed = deviceName.trim()
  const isSavedOverride = trimmed === (connection.deviceNameOverride ?? "")
  const canSave = Boolean(trimmed) && trimmed !== connection.deviceName && !isSavedOverride

  function saveDeviceName() {
    const validation = teamDeviceNameFormSchema.safeParse({ deviceName })
    if (!validation.success) {
      setFormError(teamFormError(validation.error))
      return
    }
    setFormError(null)
    void onUpdateDeviceName(validation.data.deviceName)
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Device name</h3>
        <Button
          type="button"
          size="icon-xs"
          variant="outline"
          aria-label="Reset"
          disabled={busy || !connection.deviceNameOverride}
          onClick={() => onUpdateDeviceName(null)}
        >
          <RotateCcw className="size-3" />
        </Button>
      </div>

      <div
        className={cn(
          "flex h-8 items-center rounded-md border bg-input/45 px-2 transition-colors",
          "focus-within:border-primary/60 focus-within:bg-background"
        )}
      >
        <input
          aria-label="Device name"
          value={deviceName}
          maxLength={DEVICE_NAME_FORM_MAX_LENGTH}
          aria-invalid={Boolean(formError)}
          aria-describedby={formError ? errorId : undefined}
          onChange={(event) => {
            setDeviceName(event.target.value)
            setFormError(null)
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          size="icon-xs"
          aria-label="Save"
          className="ml-1"
          disabled={busy || !canSave}
          onClick={saveDeviceName}
        >
          <Save className="size-3.5" />
        </Button>
      </div>
      {formError ? (
        <p id={errorId} className="m-0 text-xs font-medium text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
    </section>
  )
}

function TeamStatusIndicators({
  connection,
  status,
  message,
}: {
  connection: TeamConnectionSettings | null
  status: string
  message: string | null
}) {
  if (!connection) {
    return <TeamStatusBadge connection={connection} status={status} />
  }

  const statusMessage = message ?? connection.lastError
  const messageStatus = connection.syncStatus === "connected" ? "connected" : "error"

  return (
    <div className="flex flex-col items-end gap-1.5">
      <TeamStatusBadge connection={connection} status={status} />
      <StatusMessage
        status={messageStatus}
        message={statusMessage}
        className="min-h-0 max-w-44 flex-none justify-end text-right"
      />
    </div>
  )
}

function TeamStatusBadge({
  connection,
  status,
}: {
  connection: TeamConnectionSettings | null
  status: string
}) {
  if (status === "loading") return <Badge variant="outline">Loading</Badge>
  if (!connection) return <Badge variant="outline">Disconnected</Badge>
  if (connection.syncStatus === "connected") return <Badge>Connected</Badge>
  if (status === "invalid") return <Badge variant="outline">Invalid</Badge>
  return <Badge variant="outline">Needs check-in</Badge>
}

function StatusMessage({
  status,
  message,
  className,
}: {
  status: string
  message: string | null
  className?: string
}) {
  if (!message) return <span className={cn("min-h-5 flex-1", className)} />
  const isGood = status === "connected"
  const Icon = isGood ? CheckCircle2 : AlertTriangle
  return (
    <p
      className={cn(
        "flex min-h-5 flex-1 items-center gap-1.5 text-xs",
        className,
        isGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{message}</span>
    </p>
  )
}

function InfoRow({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div className={cn("rounded-md border bg-background p-2", wide && "col-span-2")}>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-xs text-foreground">{value}</div>
    </div>
  )
}

type ProviderSummary = {
  total: number
  ready: number
  loading: number
  errors: number
}

function useProviderSummary(plugins: DisplayPluginState[]): ProviderSummary {
  return useMemo(() => {
    let ready = 0
    let loading = 0
    let errors = 0
    for (const plugin of plugins) {
      if (plugin.loading) {
        loading += 1
      } else if (plugin.error) {
        errors += 1
      } else if (plugin.data) {
        ready += 1
      }
    }
    return {
      total: plugins.length,
      ready,
      loading,
      errors,
    }
  }, [plugins])
}

function formatLastContact(value: string | null) {
  if (!value) return "No check-in yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No check-in yet"
  return date.toLocaleString()
}

function shortId(value: string) {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}...${value.slice(-6)}`
}
