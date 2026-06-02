import type { UsageMetricSampleSourceRow, UsageSnapshotSourceRow } from "./types"

type DeveloperVisibilityRow = {
  id: string
  status: "active" | "inactive"
}

export type MetricVisibilityInput<TDeveloper extends DeveloperVisibilityRow> = {
  developers: TDeveloper[]
  snapshots: UsageSnapshotSourceRow[]
  metricSamples: UsageMetricSampleSourceRow[]
  providerIds?: string[]
  disabledProviderIds?: string[]
  selectedProviderIds?: string[] | null
  hiddenDeveloperIds?: string[] | null
  selectedDeveloperIds?: string[] | null
  includeInactiveDevelopers?: boolean
}

export type MetricVisibilityResult<TDeveloper extends DeveloperVisibilityRow> = {
  developers: TDeveloper[]
  snapshots: UsageSnapshotSourceRow[]
  metricSamples: UsageMetricSampleSourceRow[]
  visibleDeveloperIds: string[]
  visibleProviderIds: string[]
}

export function resolveVisibleMetricSource<TDeveloper extends DeveloperVisibilityRow>(
  input: MetricVisibilityInput<TDeveloper>
): MetricVisibilityResult<TDeveloper> {
  const visibleProviderIds = resolveVisibleProviderIds(input)
  const visibleDevelopers = resolveVisibleDevelopers(input)
  const visibleProviderIdSet = new Set(visibleProviderIds)
  const visibleDeveloperIdSet = new Set(visibleDevelopers.map((developer) => developer.id))
  const snapshots = input.snapshots.filter(
    (snapshot) =>
      visibleProviderIdSet.has(snapshot.providerId) &&
      visibleDeveloperIdSet.has(snapshot.developerId)
  )
  const metricSamples = input.metricSamples.filter(
    (sample) =>
      visibleProviderIdSet.has(sample.providerId) &&
      (!sample.developerId || visibleDeveloperIdSet.has(sample.developerId))
  )

  return {
    developers: visibleDevelopers,
    snapshots,
    metricSamples,
    visibleDeveloperIds: visibleDevelopers.map((developer) => developer.id),
    visibleProviderIds,
  }
}

function resolveVisibleProviderIds<TDeveloper extends DeveloperVisibilityRow>(
  input: MetricVisibilityInput<TDeveloper>
) {
  const disabledProviderIds = new Set(input.disabledProviderIds ?? [])
  const providerIds = uniqueStable([
    ...(input.providerIds ?? []),
    ...input.snapshots.map((snapshot) => snapshot.providerId),
    ...input.metricSamples.map((sample) => sample.providerId),
  ]).filter((providerId) => !disabledProviderIds.has(providerId))

  if (!input.selectedProviderIds) return providerIds

  const selectedProviderIds = new Set(input.selectedProviderIds)
  return providerIds.filter((providerId) => selectedProviderIds.has(providerId))
}

function resolveVisibleDevelopers<TDeveloper extends DeveloperVisibilityRow>(
  input: MetricVisibilityInput<TDeveloper>
) {
  const hiddenDeveloperIds = new Set(input.hiddenDeveloperIds ?? [])
  const selectedDeveloperIds = input.selectedDeveloperIds
    ? new Set(input.selectedDeveloperIds)
    : null

  return input.developers.filter((developer) => {
    if (!input.includeInactiveDevelopers && developer.status === "inactive") return false
    if (hiddenDeveloperIds.has(developer.id)) return false
    if (selectedDeveloperIds && !selectedDeveloperIds.has(developer.id)) return false
    return true
  })
}

function uniqueStable(values: string[]) {
  return [...new Set(values)]
}
