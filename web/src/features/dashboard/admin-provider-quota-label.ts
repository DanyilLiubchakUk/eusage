import type { calculateQuotaPressure } from "../../lib/metrics"

type QuotaDetails = ReturnType<typeof calculateQuotaPressure>["details"]
type ProviderQuota = ReturnType<typeof calculateQuotaPressure>["perProvider"][number]

export function providerQuotaLabel(
  providerId: string,
  details: QuotaDetails,
  quota: ProviderQuota | undefined
) {
  if (providerId === "cursor") {
    const total = averageDetail(details, providerId, "Total usage")
    const api = averageDetail(details, providerId, "API usage")
    const auto = averageDetail(details, providerId, "Auto + composer")
    if (total !== null && api !== null) return `${Math.round(total)}% total · ${Math.round(api)}% API`
    if (total !== null && auto !== null) return `${Math.round(total)}% total · ${Math.round(auto)}% auto`
    if (total !== null) return `${Math.round(total)}% total`
  }

  if (providerId === "codex" || providerId === "claude") {
    const session = averageDetail(details, providerId, "Session")
    const weekly = averageDetail(details, providerId, "Weekly")
    if (session !== null && weekly !== null) {
      return `${Math.round(session)}% session · ${Math.round(weekly)}% weekly`
    }
    if (session !== null) return `${Math.round(session)}% session`
    if (weekly !== null) return `${Math.round(weekly)}% weekly`
  }

  const simpleQuota = averageDetail(details, providerId, "Quota")
  if (simpleQuota !== null) return `${Math.round(simpleQuota)}% quota`

  if (!quota || quota.averagePercent === null) return quota?.coverage.label ?? "0 reports"
  return `${Math.round(quota.averagePercent)}% avg · ${quota.coverage.label}`
}

function averageDetail(details: QuotaDetails, providerId: string, label: string) {
  const values = details
    .filter((detail) => detail.providerId === providerId && detail.label === label)
    .map((detail) => detail.percent)
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
