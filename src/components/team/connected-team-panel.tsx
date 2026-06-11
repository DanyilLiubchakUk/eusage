import { useEffect, useState } from "react"
import { RefreshCw, RotateCcw, Save, Unplug } from "lucide-react"
import { ProviderAccountSharingSection } from "@/components/team/provider-account-sharing-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  ProviderAccountSharingSettings,
  ProviderAccountSharingSyncNotice,
} from "@/lib/provider-account-sharing"
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings"
import type { TeamConnectionSettings } from "@/lib/team-settings"
import { cn } from "@/lib/utils"
import {
  DEVICE_NAME_FORM_MAX_LENGTH,
  teamDeviceNameFormSchema,
  teamFormError,
} from "@/pages/team-form-validation"

export type TeamProviderSummary = {
  total: number
  ready: number
  loading: number
  errors: number
}

type ConnectedTeamPanelProps = {
  connection: TeamConnectionSettings
  busy: boolean
  confirmDisconnect: boolean
  providerSummary: TeamProviderSummary
  providerAccountGroups: ProviderAccountSettingsGroup[]
  providerAccountSharingSettings: ProviderAccountSharingSettings
  providerAccountSharingSyncNotice?: ProviderAccountSharingSyncNotice | null
  onCheckIn: () => void
  onUpdateDeviceName: (deviceNameOverride: string | null) => Promise<unknown>
  onProviderAccountSharingChange: (localAccountFingerprint: string, shared: boolean) => void
  onProviderAccountSharingConfirm: (localAccountFingerprint: string) => void
  onProviderAccountSharingRetry: () => void
  onDisconnect: () => void
  onCancelDisconnect: () => void
}

export function ConnectedTeamPanel({
  connection,
  busy,
  confirmDisconnect,
  providerSummary,
  providerAccountGroups,
  providerAccountSharingSettings,
  providerAccountSharingSyncNotice,
  onCheckIn,
  onUpdateDeviceName,
  onProviderAccountSharingChange,
  onProviderAccountSharingConfirm,
  onProviderAccountSharingRetry,
  onDisconnect,
  onCancelDisconnect,
}: ConnectedTeamPanelProps) {
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

      <ProviderAccountSharingSection
        groups={providerAccountGroups}
        sharingSettings={providerAccountSharingSettings}
        syncNotice={providerAccountSharingSyncNotice}
        onSharingChange={onProviderAccountSharingChange}
        onSharingConfirm={onProviderAccountSharingConfirm}
        onSharingRetry={onProviderAccountSharingRetry}
      />

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
