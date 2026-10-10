import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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

export function useProviderAccountSharing(
  groups: ProviderAccountSettingsGroup[],
  providerAccountsLoaded = true
) {
  const [providerAccountSharingSettings, setProviderAccountSharingSettings] =
    useState<ProviderAccountSharingSettings>({
      ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
    })
  const [providerAccountSharingSyncNotice, setProviderAccountSharingSyncNotice] =
    useState<ProviderAccountSharingSyncNotice | null>(null)
  const settingsRef = useRef(providerAccountSharingSettings)
  const loadVersion = useRef(0)
  const setSharingSettings = useCallback((next: ProviderAccountSharingSettings) => {
    settingsRef.current = next
    setProviderAccountSharingSettings(next)
  }, [])

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
    if (!providerAccountsLoaded) return
    const version = ++loadVersion.current

    try {
      const loaded = await loadProviderAccountSharingSettings()
      if (version !== loadVersion.current) return
      setSharingSettings(loaded)
      const next = pruneProviderAccountSharing(loaded, shareableFingerprints)
      if (!areProviderAccountSharingSettingsEqual(loaded, next)) {
        const saved = await saveProviderAccountSharingSettings(next)
        if (version !== loadVersion.current) return
        if (!saved) {
          const current = await loadProviderAccountSharingSettings()
          if (version === loadVersion.current) setSharingSettings(current)
          return
        }
      }
      if (version === loadVersion.current) {
        setSharingSettings(next)
        return next
      }
    } catch (error) {
      console.error("Failed to load provider account sharing settings:", error)
      if (version === loadVersion.current) {
        setProviderAccountSharingSyncNotice({ tone: "error", message: "Sharing settings could not be loaded or updated. Try again." })
      }
    }
  }, [providerAccountsLoaded, shareableFingerprints, setSharingSettings])

  useEffect(() => {
    void reloadProviderAccountSharingSettings()
    return () => { loadVersion.current += 1 }
  }, [reloadProviderAccountSharingSettings])

  const syncSharedProviderAccount = useCallback(async (account: LocalProviderAccount) => {
    const connectionId = settingsRef.current.connectionId
    const result = await syncSharedProviderAccountWithTeam(account)
    if (settingsRef.current.connectionId !== connectionId || !settingsRef.current.sharedLocalAccountFingerprints.includes(account.localAccountFingerprint)) return
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

    const previous = settingsRef.current
    const result = updateProviderAccountSharing(pruneProviderAccountSharing(previous, shareableFingerprints), fingerprint, shared)
    if (!result.ok) {
      console.error("Failed to update provider account sharing settings:", result)
      return
    }
    const version = ++loadVersion.current
    setSharingSettings(result.value)
    void saveProviderAccountSharingSettings(result.value)
      .then(async (saved) => {
        if (!saved) {
          if (version === loadVersion.current) {
            setProviderAccountSharingSyncNotice({ tone: "error", message: "Team connection changed. Review sharing and try again." })
            await reloadProviderAccountSharingSettings()
          }
          return
        }
        if (shared && account && settingsRef.current.connectionId === previous.connectionId && settingsRef.current.sharedLocalAccountFingerprints.includes(fingerprint)) {
          return syncSharedProviderAccount(account)
        }
      })
      .catch((error) => {
        console.error("Failed to save provider account sharing settings:", error)
        if (version === loadVersion.current) {
          setSharingSettings(previous)
          setProviderAccountSharingSyncNotice({ tone: "error", message: "Sharing could not be saved. Try again." })
          void reloadProviderAccountSharingSettings()
        }
      })
  }, [shareableAccounts, shareableFingerprints, setSharingSettings, syncSharedProviderAccount, reloadProviderAccountSharingSettings])

  const resetProviderAccountSharing = useCallback(async () => {
    const previous = settingsRef.current
    const version = ++loadVersion.current
    setProviderAccountSharingSyncNotice(null)
    setSharingSettings({ ...previous, ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS })
    try {
      if (!await clearProviderAccountSharingSettings(previous) && version === loadVersion.current) {
        await reloadProviderAccountSharingSettings()
      }
    } catch (error) {
      console.error("Failed to clear provider account sharing settings:", error)
      if (version === loadVersion.current) {
        setSharingSettings(previous)
        setProviderAccountSharingSyncNotice({ tone: "error", message: "Sharing could not be cleared. Try again." })
        await reloadProviderAccountSharingSettings()
      }
    }
  }, [reloadProviderAccountSharingSettings, setSharingSettings])

  const retryProviderAccountSharingSync = useCallback(async () => {
    setProviderAccountSharingSyncNotice(null)
    const loaded = await reloadProviderAccountSharingSettings()
    if (!loaded || settingsRef.current !== loaded) return
    for (const fingerprint of loaded.sharedLocalAccountFingerprints) {
      const account = shareableAccounts.get(fingerprint)
      if (account) void syncSharedProviderAccount(account)
    }
  }, [
    reloadProviderAccountSharingSettings,
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
