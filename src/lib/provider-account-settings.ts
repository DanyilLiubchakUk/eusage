import type { LocalProviderAccount } from "@/lib/provider-account-registry"

export type ProviderAccountSettingsProvider = {
  id: string
  name: string
  iconUrl?: string
}

export type ProviderAccountSettingsGroup = {
  providerId: string
  providerName: string
  providerIconUrl?: string
  visibleAccounts: LocalProviderAccount[]
  hiddenAccounts: LocalProviderAccount[]
  notDetectedAccounts: LocalProviderAccount[]
}

export type ShareableProviderAccountGroup = {
  providerId: string
  providerName: string
  providerIconUrl?: string
  accounts: LocalProviderAccount[]
}

export function buildProviderAccountSettingsGroups({
  accounts,
  providers,
}: {
  accounts: LocalProviderAccount[]
  providers: ProviderAccountSettingsProvider[]
}): ProviderAccountSettingsGroup[] {
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]))
  const providerOrder = new Map(providers.map((provider, index) => [provider.id, index]))
  const groups = new Map<string, LocalProviderAccount[]>()

  for (const account of accounts) {
    groups.set(account.providerId, [...(groups.get(account.providerId) ?? []), account])
  }

  return [...groups.entries()]
    .map(([providerId, providerAccounts]) => {
      const provider = providerMap.get(providerId)
      const detectedAccounts = sortAccounts(
        providerAccounts.filter((account) => account.detectionState === "detected")
      )
      return {
        providerId,
        providerName: provider?.name ?? providerId,
        providerIconUrl: provider?.iconUrl,
        visibleAccounts: detectedAccounts.filter((account) => account.visibility === "visible"),
        hiddenAccounts: detectedAccounts.filter((account) => account.visibility === "hidden"),
        notDetectedAccounts: sortAccounts(
          providerAccounts.filter((account) => account.detectionState === "notDetected")
        ),
      }
    })
    .sort((a, b) => compareGroups(a, b, providerOrder))
}

export function getShareableProviderAccountGroups(
  groups: ProviderAccountSettingsGroup[]
): ShareableProviderAccountGroup[] {
  return groups
    .map((group) => ({
      providerId: group.providerId,
      providerName: group.providerName,
      providerIconUrl: group.providerIconUrl,
      accounts: group.visibleAccounts,
    }))
    .filter((group) => group.accounts.length > 0)
}

function sortAccounts(accounts: LocalProviderAccount[]): LocalProviderAccount[] {
  return [...accounts].sort((a, b) => (
    a.firstSeenAt.localeCompare(b.firstSeenAt) ||
    a.label.localeCompare(b.label) ||
    a.localAccountFingerprint.localeCompare(b.localAccountFingerprint)
  ))
}

function compareGroups(
  a: ProviderAccountSettingsGroup,
  b: ProviderAccountSettingsGroup,
  providerOrder: Map<string, number>
): number {
  const aIndex = providerOrder.get(a.providerId)
  const bIndex = providerOrder.get(b.providerId)
  if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex
  if (aIndex !== undefined) return -1
  if (bIndex !== undefined) return 1
  return a.providerName.localeCompare(b.providerName) || a.providerId.localeCompare(b.providerId)
}
