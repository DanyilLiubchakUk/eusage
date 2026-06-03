import { FormEvent, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Plug,
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

type TeamPageProps = {
  plugins: DisplayPluginState[]
}

export function TeamPage({ plugins }: TeamPageProps) {
  const { state, connect, checkIn, disconnect, updateDeviceName } = useTeamConnection()
  const [connectionString, setConnectionString] = useState("")
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const providerSummary = useProviderSummary(plugins)
  const busy =
    state.status === "connecting" ||
    state.status === "disconnecting" ||
    state.status === "checking" ||
    state.status === "loading"

  const handleConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await connect(connectionString)
    if (result.ok) setConnectionString("")
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
    <div className="py-3 pb-5 space-y-4">
      <header className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-lg font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">
            {state.connection ? state.connection.teamName : "No team connected"}
          </p>
        </div>
        <TeamStatusBadge connection={state.connection} status={state.status} />
      </header>

      {state.connection ? (
        <ConnectedTeamPanel
          connection={state.connection}
          message={state.message}
          busy={busy}
          confirmDisconnect={confirmDisconnect}
          providerSummary={providerSummary}
          onCheckIn={checkIn}
          onUpdateDeviceName={updateDeviceName}
          onDisconnect={handleDisconnect}
          onCancelDisconnect={() => setConfirmDisconnect(false)}
        />
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-muted-foreground">
              Connection string
            </span>
            <textarea
              value={connectionString}
              onChange={(event) => setConnectionString(event.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="eusage://connect?url=https://your-eusage.vercel.app&token=eusage_dev_..."
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-xs font-mono outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <StatusMessage status={state.status} message={state.message} />
            <Button type="submit" size="sm" disabled={busy || !connectionString.trim()}>
              <Plug className="size-4" />
              Connect
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function ConnectedTeamPanel({
  connection,
  message,
  busy,
  confirmDisconnect,
  providerSummary,
  onCheckIn,
  onUpdateDeviceName,
  onDisconnect,
  onCancelDisconnect,
}: {
  connection: TeamConnectionSettings
  message: string | null
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
          <InfoRow
            label="Last contact"
            value={formatLastContact(connection.lastContactAt)}
          />
          <InfoRow
            label="Device status"
            value={connection.deviceStatus ?? "No check-in yet"}
          />
        </div>
        <StatusMessage
          status={connection.syncStatus === "connected" ? "connected" : "error"}
          message={message ?? connection.lastError}
        />
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

      <div className="flex items-center justify-between gap-2">
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

  useEffect(() => {
    setDeviceName(connection.deviceName)
  }, [connection.deviceName])

  const trimmed = deviceName.trim()
  const isSavedOverride = trimmed === (connection.deviceNameOverride ?? "")
  const canSave = Boolean(trimmed) && trimmed !== connection.deviceName && !isSavedOverride
  const canRevertEdit = deviceName !== connection.deviceName

  return (
    <section>
      <h3 className="text-lg font-semibold mb-2">Device Name</h3>

      <div
        className={cn(
          "flex h-8 items-center rounded-md border bg-muted/50 px-2 transition-colors",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]"
        )}
      >
        <input
          aria-label="Device name"
          value={deviceName}
          onChange={(event) => setDeviceName(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          size="icon-xs"
          aria-label="Save"
          className="ml-1"
          disabled={busy || !canSave}
          onClick={() => onUpdateDeviceName(trimmed)}
        >
          <Save className="size-3.5" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={busy || !canRevertEdit}
          onClick={() => setDeviceName(connection.deviceName)}
        >
          Revert
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={busy || !connection.deviceNameOverride}
          onClick={() => onUpdateDeviceName(null)}
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>
    </section>
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

function StatusMessage({ status, message }: { status: string; message: string | null }) {
  if (!message) return <span className="min-h-5 flex-1" />
  const isGood = status === "connected"
  const Icon = isGood ? CheckCircle2 : AlertTriangle
  return (
    <p
      className={cn(
        "flex min-h-5 flex-1 items-center gap-1.5 text-xs",
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
