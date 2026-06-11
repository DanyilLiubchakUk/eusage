import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  ConnectedTeamPanel,
  type TeamProviderSummary,
} from "@/components/team/connected-team-panel"
import { Badge } from "@/components/ui/badge"
import type { DisplayPluginState } from "@/hooks/app/use-app-plugin-views"
import { useTeamConnection } from "@/hooks/app/use-team-connection"
import type { ProviderAccountSharingSettings } from "@/lib/provider-account-sharing"
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings"
import type { TeamConnectionSettings } from "@/lib/team-settings"
import { cn } from "@/lib/utils"
import { TeamConnectionForm } from "@/pages/team-connection-form"

type TeamPageProps = {
  plugins: DisplayPluginState[]
  providerAccountGroups: ProviderAccountSettingsGroup[]
  providerAccountSharingSettings: ProviderAccountSharingSettings
  providerAccountSharingSyncError?: string | null
  onProviderAccountSharingChange: (localAccountFingerprint: string, shared: boolean) => void
  onProviderAccountSharingConfirm: (localAccountFingerprint: string) => void
  onProviderAccountSharingReset: () => Promise<void> | void
  onConnected?: () => void
}

export function TeamPage({
  plugins,
  providerAccountGroups,
  providerAccountSharingSettings,
  providerAccountSharingSyncError = null,
  onProviderAccountSharingChange,
  onProviderAccountSharingConfirm,
  onProviderAccountSharingReset,
  onConnected,
}: TeamPageProps) {
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
      await onProviderAccountSharingReset()
      onConnected?.()
    }
    return result.ok
  }

  const handleDisconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true)
      return
    }
    const result = await disconnect()
    if (result.ok) {
      await onProviderAccountSharingReset()
    }
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
          providerAccountGroups={providerAccountGroups}
          providerAccountSharingSettings={providerAccountSharingSettings}
          providerAccountSharingSyncError={providerAccountSharingSyncError}
          onCheckIn={checkIn}
          onUpdateDeviceName={updateDeviceName}
          onProviderAccountSharingChange={onProviderAccountSharingChange}
          onProviderAccountSharingConfirm={onProviderAccountSharingConfirm}
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

function useProviderSummary(plugins: DisplayPluginState[]): TeamProviderSummary {
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
