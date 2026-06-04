export const DEFAULT_REPORTING_TIME_ZONE = "UTC"
const DAY_MS = 24 * 60 * 60 * 1000
const timeZoneFormatters = new Map<string, Intl.DateTimeFormat>()

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

export function addReportingDays(day: string, days: number) {
  return formatUtcDay(parseReportingDayMs(day) + days * DAY_MS)
}

export function reportingDayToUtcBoundary(
  day: string,
  reportingTimeZone = DEFAULT_REPORTING_TIME_ZONE
) {
  const parts = parseReportingDay(day)
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day)
  if (reportingTimeZone === DEFAULT_REPORTING_TIME_ZONE) return utcGuess

  const firstPass = utcGuess - timeZoneOffsetMs(utcGuess, reportingTimeZone)
  return utcGuess - timeZoneOffsetMs(firstPass, reportingTimeZone)
}

function parseReportingDayMs(day: string) {
  const parts = parseReportingDay(day)
  return Date.UTC(parts.year, parts.month - 1, parts.day)
}

function parseReportingDay(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) throw new Error(`Invalid reporting day: ${day}`)

  const year = Number(match[1])
  const month = Number(match[2])
  const dayOfMonth = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, dayOfMonth)
  if (formatUtcDay(timestamp) !== day) throw new Error(`Invalid reporting day: ${day}`)
  return { year, month, day: dayOfMonth }
}

function formatUtcDay(timestamp: number) {
  const date = new Date(timestamp)
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-")
}

function timeZoneOffsetMs(timestamp: number, reportingTimeZone: string) {
  const parts = timeZoneParts(timestamp, reportingTimeZone)
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ) - timestamp
}

function timeZoneParts(timestamp: number, reportingTimeZone: string) {
  const values = Object.fromEntries(
    timeZoneFormatter(reportingTimeZone)
      .formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  )

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function timeZoneFormatter(reportingTimeZone: string) {
  const cached = timeZoneFormatters.get(reportingTimeZone)
  if (cached) return cached

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: reportingTimeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  timeZoneFormatters.set(reportingTimeZone, formatter)
  return formatter
}
