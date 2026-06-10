import { useCallback, useEffect, useMemo, useState } from "react"
import {
  areProviderAccountSharingSettingsEqual,
  DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
  pruneProviderAccountSharing,
  updateProviderAccountSharing,
  type ProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing"
import {
  clearProviderAccountSharingSettings,
  loadProviderAccountSharingSettings,
  saveProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing-store"
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings"

export function useProviderAccountSharing(groups: ProviderAccountSettingsGroup[]) {
  const [providerAccountSharingSettings, setProviderAccountSharingSettings] =
    useState<ProviderAccountSharingSettings>({
      ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
    })

  const shareableFingerprintKey = useMemo(
    () => getShareableFingerprints(groups).join("\n"),
    [groups]
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

  const handleProviderAccountSharingChange = useCallback((
    localAccountFingerprint: string,
    shared: boolean
  ) => {
    if (shared && !shareableFingerprints.has(localAccountFingerprint)) return

    setProviderAccountSharingSettings((current) => {
      const result = updateProviderAccountSharing(
        current,
        localAccountFingerprint,
        shared
      )
      if (!result.ok) {
        console.error("Failed to update provider account sharing settings:", result)
        return current
      }
      void saveProviderAccountSharingSettings(result.value).catch((error) => {
        console.error("Failed to save provider account sharing settings:", error)
      })
      return result.value
    })
  }, [shareableFingerprints])

  const resetProviderAccountSharing = useCallback(async () => {
    setProviderAccountSharingSettings({ ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS })
    try {
      await clearProviderAccountSharingSettings()
    } catch (error) {
      console.error("Failed to clear provider account sharing settings:", error)
    }
  }, [])

  return {
    providerAccountSharingSettings,
    reloadProviderAccountSharingSettings,
    resetProviderAccountSharing,
    handleProviderAccountSharingChange,
  }
}

function getShareableFingerprints(groups: ProviderAccountSettingsGroup[]): string[] {
  return groups
    .flatMap((group) => group.visibleAccounts)
    .map((account) => account.localAccountFingerprint)
    .sort()
}
