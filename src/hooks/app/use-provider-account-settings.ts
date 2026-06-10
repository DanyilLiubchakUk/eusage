import { useCallback, useEffect, useState } from "react"
import {
  forgetProviderAccount,
  updateProviderAccountLabel,
  updateProviderAccountVisibility,
  type ProviderAccountRegistry,
  type ProviderAccountRegistryResult,
} from "@/lib/provider-account-registry"
import {
  loadProviderAccountRegistry,
  saveProviderAccountRegistry,
} from "@/lib/provider-account-registry-store"

export function useProviderAccountSettings() {
  const [providerAccountRegistry, setProviderAccountRegistry] =
    useState<ProviderAccountRegistry>({ accounts: [] })

  const reloadProviderAccountRegistry = useCallback(async () => {
    try {
      setProviderAccountRegistry(await loadProviderAccountRegistry())
    } catch (error) {
      console.error("Failed to load provider account registry:", error)
    }
  }, [])

  useEffect(() => {
    void reloadProviderAccountRegistry()
  }, [reloadProviderAccountRegistry])

  const applyRegistryUpdate = useCallback((
    update: (registry: ProviderAccountRegistry) =>
      ProviderAccountRegistryResult<ProviderAccountRegistry>,
    errorMessage: string
  ) => {
    setProviderAccountRegistry((current) => {
      const result = update(current)
      if (!result.ok) {
        console.error(errorMessage, result)
        return current
      }

      void saveProviderAccountRegistry(result.value).catch((error) => {
        console.error("Failed to save provider account registry:", error)
      })
      return result.value
    })
  }, [])

  const handleProviderAccountRename = useCallback((
    localAccountFingerprint: string,
    label: string
  ) => {
    applyRegistryUpdate(
      (registry) =>
        updateProviderAccountLabel(registry, localAccountFingerprint, label),
      "Failed to rename provider account:"
    )
  }, [applyRegistryUpdate])

  const handleProviderAccountVisibilityChange = useCallback((
    localAccountFingerprint: string,
    visible: boolean
  ) => {
    applyRegistryUpdate(
      (registry) =>
        updateProviderAccountVisibility(
          registry,
          localAccountFingerprint,
          visible ? "visible" : "hidden"
        ),
      "Failed to update provider account visibility:"
    )
  }, [applyRegistryUpdate])

  const handleProviderAccountForget = useCallback((localAccountFingerprint: string) => {
    applyRegistryUpdate(
      (registry) => forgetProviderAccount(registry, localAccountFingerprint),
      "Failed to forget provider account:"
    )
  }, [applyRegistryUpdate])

  return {
    providerAccountRegistry,
    reloadProviderAccountRegistry,
    handleProviderAccountRename,
    handleProviderAccountVisibilityChange,
    handleProviderAccountForget,
  }
}
