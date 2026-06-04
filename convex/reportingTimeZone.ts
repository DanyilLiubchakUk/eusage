export const DEFAULT_REPORTING_TIME_ZONE = "UTC"

export function reportingTimeZoneOrDefault(value: unknown) {
  return normalizeReportingTimeZone(value) ?? DEFAULT_REPORTING_TIME_ZONE
}

export function normalizeReportingTimeZone(value: unknown) {
  if (typeof value !== "string") return null
  const reportingTimeZone = value.trim()
  if (!reportingTimeZone) return null
  return isValidReportingTimeZone(reportingTimeZone) ? reportingTimeZone : null
}

export function isValidReportingTimeZone(reportingTimeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: reportingTimeZone })
    return true
  } catch {
    return false
  }
}
