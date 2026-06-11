import { useCallback, useEffect, useMemo, useState } from "react"
import {
  areProviderAccountSharingSettingsEqual,
  DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
  pruneProviderAccountSharing,
  updateProviderAccountSharing,
  type ProviderAccountSharingSettings,
  type ProviderAccountSharingSyncNotice,
} from "@/lib/provider-account-sharing"
import {
  clearProviderAccountSharingSettings,
  loadProviderAccountSharingSettings,
  saveProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing-store"
import {
  syncSharedProviderAccount as syncSharedProviderAccountWithTeam,
  type SharedProviderAccountSyncResult,
} from "@/lib/provider-account-team-sync"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings"

export function useProviderAccountSharing(groups: ProviderAccountSettingsGroup[]) {
  const [providerAccountSharingSettings, setProviderAccountSharingSettings] =
    useState<ProviderAccountSharingSettings>({
      ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
    })
  const [providerAccountSharingSyncNotice, setProviderAccountSharingSyncNotice] =
    useState<ProviderAccountSharingSyncNotice | null>(null)

  const shareableAccounts = useMemo(() => getShareableAccounts(groups), [groups])

  const shareableFingerprintKey = useMemo(
    () => [...shareableAccounts.keys()].sort().join("\n"),
    [shareableAccounts]
  )

  const shareableFingerprints = useMemo(
    () => new Set(shareableFingerprintKey ? shareableFingerprintKey.split("\n") : []),
    [shareableFingerprintKey]
  )

  const reloadProviderAccountSharingSettings = useCallback(async () => {
    try {
      const loaded = await loadProviderAccountSharingSettings()
      const next = pruneProviderAccountSharing(loaded, shareableFingerprints)
      setProviderAccountSharingSettings(next)
      if (!areProviderAccountSharingSettingsEqual(loaded, next)) {
        void saveProviderAccountSharingSettings(next).catch((error) => {
          console.error("Failed to prune provider account sharing settings:", error)
        })
      }
    } catch (error) {
      console.error("Failed to load provider account sharing settings:", error)
    }
  }, [shareableFingerprints])

  useEffect(() => {
    void reloadProviderAccountSharingSettings()
  }, [reloadProviderAccountSharingSettings])

  useEffect(() => {
    setProviderAccountSharingSettings((current) => {
      const next = pruneProviderAccountSharing(current, shareableFingerprints)
      if (areProviderAccountSharingSettingsEqual(current, next)) return current
      void saveProviderAccountSharingSettings(next).catch((error) => {
        console.error("Failed to prune provider account sharing settings:", error)
      })
      return next
    })
  }, [shareableFingerprints])

  const syncSharedProviderAccount = useCallback(async (account: LocalProviderAccount) => {
    const result = await syncSharedProviderAccountWithTeam(account)
    const notice = syncResultToNotice(result)
    if (notice) setProviderAccountSharingSyncNotice(notice)
    if (!result.ok) {
      console.error("Failed to sync shared Provider Account with team:", result.message)
    }
  }, [])

  const handleProviderAccountSharingChange = useCallback((
    localAccountFingerprint: string,
    shared: boolean
  ) => {
    const fingerprint = localAccountFingerprint.trim()
    const account = shareableAccounts.get(fingerprint)
    if (shared && !account) return
    setProviderAccountSharingSyncNotice(null)

    setProviderAccountSharingSettings((current) => {
      const result = updateProviderAccountSharing(
        current,
        fingerprint,
        shared
      )
      if (!result.ok) {
        console.error("Failed to update provider account sharing settings:", result)
        return current
      }
      void saveProviderAccountSharingSettings(result.value)
        .then(() => {
          if (shared && account) return syncSharedProviderAccount(account)
        })
        .catch((error) => {
          console.error("Failed to save provider account sharing settings:", error)
        })
      return result.value
    })
  }, [shareableAccounts, syncSharedProviderAccount])

  const resetProviderAccountSharing = useCallback(async () => {
    setProviderAccountSharingSyncNotice(null)
    setProviderAccountSharingSettings({ ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS })
    try {
      await clearProviderAccountSharingSettings()
    } catch (error) {
      console.error("Failed to clear provider account sharing settings:", error)
    }
  }, [])

  const retryProviderAccountSharingSync = useCallback(() => {
    setProviderAccountSharingSyncNotice(null)
    for (const fingerprint of providerAccountSharingSettings.sharedLocalAccountFingerprints) {
      const account = shareableAccounts.get(fingerprint)
      if (account) void syncSharedProviderAccount(account)
    }
  }, [
    providerAccountSharingSettings.sharedLocalAccountFingerprints,
    shareableAccounts,
    syncSharedProviderAccount,
  ])

  return {
    providerAccountSharingSettings,
    providerAccountSharingSyncNotice,
    reloadProviderAccountSharingSettings,
    resetProviderAccountSharing,
    handleProviderAccountSharingChange,
    retryProviderAccountSharingSync,
  }
}

function syncResultToNotice(
  result: SharedProviderAccountSyncResult
): ProviderAccountSharingSyncNotice | null {
  if (result.ok && result.status === "synced") return null
  if (result.ok && result.status === "waitingForProviderScan") {
    return {
      tone: "info",
      message: result.message,
    }
  }
  return {
    tone: "error",
    message: `Sharing saved locally. Team still sees old or missing account data. ${result.message}`,
  }
}

function getShareableAccounts(
  groups: ProviderAccountSettingsGroup[]
): Map<string, LocalProviderAccount> {
  const accounts = new Map<string, LocalProviderAccount>()
  for (const group of groups) {
    for (const account of group.visibleAccounts) {
      accounts.set(account.localAccountFingerprint, account)
    }
  }
  return accounts
}
