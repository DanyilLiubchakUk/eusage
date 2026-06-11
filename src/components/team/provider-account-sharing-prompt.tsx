import { useEffect, useMemo, useState, type MouseEvent } from "react"
import { CheckCircle2, X } from "lucide-react"
import { ProviderAccountIcon } from "@/components/provider-account-icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import {
  getShareableProviderAccountGroups,
  providerAccountNeedsSharingConfirmation,
  type ProviderAccountSettingsGroup,
  type ShareableProviderAccountGroup,
} from "@/lib/provider-account-settings"
import { cn } from "@/lib/utils"

type ProviderAccountSharingPromptProps = {
  groups: ProviderAccountSettingsGroup[]
  onClose: () => void
  onShareSelected: (localAccountFingerprint: string) => void
  onConfirmShareSelected: (localAccountFingerprint: string) => void
}

export function ProviderAccountSharingPrompt({
  groups,
  onClose,
  onShareSelected,
  onConfirmShareSelected,
}: ProviderAccountSharingPromptProps) {
  const shareableGroups = useMemo(
    () => getShareableProviderAccountGroups(groups),
    [groups]
  )
  const shareableFingerprints = useMemo(
    () => new Set(shareableGroups.flatMap((group) =>
      group.accounts.map((account) => account.localAccountFingerprint)
    )),
    [shareableGroups]
  )
  const [selectedFingerprints, setSelectedFingerprints] = useState<Set<string>>(
    () => new Set()
  )
  const [confirmSharing, setConfirmSharing] = useState(false)
  const selectedCount = selectedFingerprints.size
  const selectedAccounts = useMemo(
    () => getSelectedProviderAccounts(shareableGroups, selectedFingerprints),
    [selectedFingerprints, shareableGroups]
  )
  const hasAccountsNeedingConfirmation = selectedAccounts.some((row) =>
    providerAccountNeedsSharingConfirmation(row.account, row.providerName)
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  useEffect(() => {
    setSelectedFingerprints((current) => {
      const next = new Set(
        [...current].filter((fingerprint) => shareableFingerprints.has(fingerprint))
      )
      return next.size === current.size ? current : next
    })
    setConfirmSharing(false)
  }, [shareableFingerprints])

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const toggleAccount = (account: LocalProviderAccount, checked: boolean) => {
    setConfirmSharing(false)
    setSelectedFingerprints((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(account.localAccountFingerprint)
      } else {
        next.delete(account.localAccountFingerprint)
      }
      return next
    })
  }

  const shareSelected = () => {
    if (hasAccountsNeedingConfirmation && !confirmSharing) {
      setConfirmSharing(true)
      return
    }

    for (const { account, providerName } of selectedAccounts) {
      if (providerAccountNeedsSharingConfirmation(account, providerName)) {
        onConfirmShareSelected(account.localAccountFingerprint)
      } else {
        onShareSelected(account.localAccountFingerprint)
      }
    }
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-provider-sharing-title"
        className="flex max-h-[88%] w-[92%] flex-col overflow-hidden rounded-lg border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 id="team-provider-sharing-title" className="text-sm font-semibold">
              Share Provider Accounts
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose accounts to share with this team.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close Provider Account sharing prompt"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>

        {shareableGroups.length === 0 ? (
          <div className="m-4 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            No visible Provider Accounts to share.
          </div>
        ) : (
          <div
            data-testid="provider-account-sharing-scroll"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 custom-scrollbar"
          >
            <div className="divide-y divide-border/60 overflow-hidden rounded-md border bg-background">
              {shareableGroups.map((group) => (
                <ProviderAccountSharingPromptGroup
                  key={group.providerId}
                  group={group}
                  selectedFingerprints={selectedFingerprints}
                  onToggle={toggleAccount}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <div className="min-w-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Skip for now
            </Button>
            {confirmSharing ? (
              <p className="mt-1 truncate text-xs text-amber-700 dark:text-amber-300">
                Confirm selected accounts before sharing.
              </p>
            ) : null}
          </div>
          <Button type="button" size="sm" disabled={selectedCount === 0} onClick={shareSelected}>
            <CheckCircle2 className="size-4" />
            {confirmSharing ? "Confirm and share" : "Share selected"}
          </Button>
        </div>
      </section>
    </div>
  )
}

function getSelectedProviderAccounts(
  groups: ShareableProviderAccountGroup[],
  selectedFingerprints: Set<string>
): Array<{ account: LocalProviderAccount; providerName: string }> {
  const accounts = new Map<string, { account: LocalProviderAccount; providerName: string }>()
  for (const group of groups) {
    for (const account of group.accounts) {
      accounts.set(account.localAccountFingerprint, {
        account,
        providerName: group.providerName,
      })
    }
  }
  return [...selectedFingerprints].flatMap((fingerprint) => {
    const selected = accounts.get(fingerprint)
    return selected ? [selected] : []
  })
}

function ProviderAccountSharingPromptGroup({
  group,
  selectedFingerprints,
  onToggle,
}: {
  group: ShareableProviderAccountGroup
  selectedFingerprints: Set<string>
  onToggle: (account: LocalProviderAccount, checked: boolean) => void
}) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 px-1 pb-1.5">
        <ProviderAccountIcon iconUrl={group.providerIconUrl} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {group.providerName}
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {group.accounts.length}
        </span>
      </div>
      <div className="grid gap-0.5">
        {group.accounts.map((account) => {
          const checked = selectedFingerprints.has(account.localAccountFingerprint)
          return (
            <label
              key={account.localAccountFingerprint}
              className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60"
            >
              <Checkbox
                checked={checked}
                aria-label={`Share ${account.label}`}
                onCheckedChange={(value) => onToggle(account, value === true)}
              />
              <span
                className={cn(
                  "min-w-0 truncate text-sm font-medium",
                  checked ? "text-foreground" : "text-muted-foreground/80"
                )}
              >
                {account.label}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
