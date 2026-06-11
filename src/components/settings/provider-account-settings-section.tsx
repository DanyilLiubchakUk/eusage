import { useEffect, useState, type KeyboardEvent } from "react"
import { Eye, EyeOff, Trash2 } from "lucide-react"
import { ProviderAccountIcon } from "@/components/provider-account-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings"

type ProviderAccountSettingsSectionProps = {
  groups: ProviderAccountSettingsGroup[]
  labelSyncError?: string | null
  onRename: (localAccountFingerprint: string, label: string) => void
  onVisibilityChange: (localAccountFingerprint: string, visible: boolean) => void
  onForget: (localAccountFingerprint: string) => void
}

type ProviderAccountActions = Omit<ProviderAccountSettingsSectionProps, "groups">

export function ProviderAccountSettingsSection({
  groups,
  labelSyncError,
  onRename,
  onVisibilityChange,
  onForget,
}: ProviderAccountSettingsSectionProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-0">Provider Accounts</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Local labels and visibility
      </p>
      {labelSyncError ? (
        <p role="alert" className="mb-2 text-xs text-destructive">
          {labelSyncError}
        </p>
      ) : null}
      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
          No Provider Accounts detected yet.
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 p-1">
          <div className="divide-y divide-border/60 overflow-hidden rounded-md bg-card">
            {groups.map((group) => (
              <ProviderAccountGroup
                key={group.providerId}
                group={group}
                onRename={onRename}
                onVisibilityChange={onVisibilityChange}
                onForget={onForget}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function ProviderAccountGroup({
  group,
  onRename,
  onVisibilityChange,
  onForget,
}: {
  group: ProviderAccountSettingsGroup
} & ProviderAccountActions) {
  const total =
    group.visibleAccounts.length +
    group.hiddenAccounts.length +
    group.notDetectedAccounts.length

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 px-1 pb-1.5">
        <ProviderAccountIcon iconUrl={group.providerIconUrl} />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold">{group.providerName}</h4>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total}
        </span>
      </div>
      <div className="divide-y divide-border/50">
        <EditableAccountList
          accounts={group.visibleAccounts}
          onRename={onRename}
          onVisibilityChange={onVisibilityChange}
        />
        <ReadOnlyAccountList
          accounts={group.hiddenAccounts}
          onVisibilityChange={onVisibilityChange}
        />
        <ProviderAccountDivider
          label="Not detected"
          count={group.notDetectedAccounts.length}
        />
        <ReadOnlyAccountList
          accounts={group.notDetectedAccounts}
          onVisibilityChange={onVisibilityChange}
          onForget={onForget}
        />
      </div>
    </div>
  )
}

function ProviderAccountDivider({ label, count }: { label: string; count: number }) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="h-px flex-1 bg-border/50" aria-hidden />
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
        {label} {count}
      </span>
      <span className="h-px flex-1 bg-border/50" aria-hidden />
    </div>
  )
}

function EditableAccountList({
  accounts,
  onRename,
  onVisibilityChange,
}: {
  accounts: LocalProviderAccount[]
  onRename: (localAccountFingerprint: string, label: string) => void
  onVisibilityChange: (localAccountFingerprint: string, visible: boolean) => void
}) {
  if (accounts.length === 0) return null

  return (
    <>
      {accounts.map((account) => (
        <EditableProviderAccountRow
          key={account.localAccountFingerprint}
          account={account}
          onRename={onRename}
          onVisibilityChange={onVisibilityChange}
        />
      ))}
    </>
  )
}

function ReadOnlyAccountList({
  accounts,
  onVisibilityChange,
  onForget,
}: {
  accounts: LocalProviderAccount[]
  onVisibilityChange: (localAccountFingerprint: string, visible: boolean) => void
  onForget?: (localAccountFingerprint: string) => void
}) {
  if (accounts.length === 0) return null

  return (
    <>
      {accounts.map((account) => (
        <ReadOnlyProviderAccountRow
          key={account.localAccountFingerprint}
          account={account}
          onVisibilityChange={onVisibilityChange}
          onForget={onForget}
        />
      ))}
    </>
  )
}

function EditableProviderAccountRow({
  account,
  onRename,
  onVisibilityChange,
}: {
  account: LocalProviderAccount
  onRename: (localAccountFingerprint: string, label: string) => void
  onVisibilityChange: (localAccountFingerprint: string, visible: boolean) => void
}) {
  const [draftLabel, setDraftLabel] = useState(account.label)

  useEffect(() => {
    setDraftLabel(account.label)
  }, [account.label])

  const saveLabel = () => {
    const nextLabel = draftLabel.trim()
    if (!nextLabel) {
      setDraftLabel(account.label)
      return
    }
    if (nextLabel !== account.label) {
      onRename(account.localAccountFingerprint, nextLabel)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur()
      return
    }
    if (event.key === "Escape") {
      setDraftLabel(account.label)
      event.currentTarget.blur()
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 py-1.5">
      <Input
        aria-label={`Label for ${account.label}`}
        value={draftLabel}
        onChange={(event) => setDraftLabel(event.target.value)}
        onBlur={saveLabel}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
      />
      <VisibilityButton
        account={account}
        onVisibilityChange={onVisibilityChange}
      />
    </div>
  )
}

function ReadOnlyProviderAccountRow({
  account,
  onVisibilityChange,
  onForget,
}: {
  account: LocalProviderAccount
  onVisibilityChange: (localAccountFingerprint: string, visible: boolean) => void
  onForget?: (localAccountFingerprint: string) => void
}) {
  const canForget = account.detectionState === "notDetected" && onForget
  const rowClassName = canForget
    ? "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 py-1.5"
    : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 py-1.5"

  return (
    <div className={rowClassName}>
      <Input
        aria-label={`Label for ${account.label}`}
        value={account.label}
        readOnly
        className="h-8 text-sm text-muted-foreground/75 opacity-70"
      />
      <VisibilityButton
        account={account}
        onVisibilityChange={onVisibilityChange}
      />
      {canForget && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Forget ${account.label}`}
          title={`Forget ${account.label}`}
          onClick={() => onForget(account.localAccountFingerprint)}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      )}
    </div>
  )
}

function VisibilityButton({
  account,
  onVisibilityChange,
}: {
  account: LocalProviderAccount
  onVisibilityChange: (localAccountFingerprint: string, visible: boolean) => void
}) {
  const isVisible = account.visibility === "visible"
  const label = isVisible ? `Hide ${account.label}` : `Show ${account.label}`

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => onVisibilityChange(account.localAccountFingerprint, !isVisible)}
    >
      {isVisible ? (
        <Eye aria-hidden className="size-4" />
      ) : (
        <EyeOff aria-hidden className="size-4" />
      )}
    </Button>
  )
}
