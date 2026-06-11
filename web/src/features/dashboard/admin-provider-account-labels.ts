import type { ProviderAccountSourceRow } from "../../lib/metrics"

type DeveloperDisplayRow = {
  id: string
  displayName: string
}

export function buildProviderAccountLabelMap(accounts: ProviderAccountSourceRow[]) {
  return new Map(
    accounts.map((account) => [
      providerAccountKey({
        developerId: account.developerId,
        providerId: account.providerId,
        providerAccountFingerprint: account.teamAccountFingerprint,
      }),
      account.label,
    ])
  )
}

export function providerAccountLabelForDetail(
  detail: { developerId: string; providerId: string; providerAccountFingerprint?: string },
  labels: Map<string, string>
) {
  if (!detail.providerAccountFingerprint) return null
  return labels.get(providerAccountKey(detail)) ?? null
}

export function buildProviderAccountSummaries(
  accounts: ProviderAccountSourceRow[],
  developers: DeveloperDisplayRow[]
) {
  const developerNames = new Map(developers.map((developer) => [developer.id, developer.displayName]))
  const byProvider = new Map<string, Map<string, string[]>>()

  for (const account of accounts) {
    const developerName = developerNames.get(account.developerId) ?? account.developerId
    const providerAccounts = byProvider.get(account.providerId) ?? new Map<string, string[]>()
    providerAccounts.set(developerName, [...(providerAccounts.get(developerName) ?? []), account.label])
    byProvider.set(account.providerId, providerAccounts)
  }

  return new Map(
    [...byProvider.entries()].map(([providerId, providerAccounts]) => [
      providerId,
      [...providerAccounts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([developerName, labels]) => `${developerName}: ${labels.join(", ")}`)
        .join("; "),
    ])
  )
}

function providerAccountKey(row: {
  developerId: string
  providerId: string
  providerAccountFingerprint?: string
}) {
  return [
    row.developerId,
    row.providerId,
    row.providerAccountFingerprint ?? "",
  ].join("\u0000")
}
