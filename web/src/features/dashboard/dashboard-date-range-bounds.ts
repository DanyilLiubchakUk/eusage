import {
  DEFAULT_REPORTING_TIME_ZONE,
  formatReportingDay,
  type UsageMetricSampleSourceRow,
} from "../../lib/metrics"

export type DashboardDateRangeBounds = {
  minDay: string
  maxDay: string
}

export function buildDashboardDateRangeBounds(
  samples: UsageMetricSampleSourceRow[],
  now: number,
  reportingTimeZone = DEFAULT_REPORTING_TIME_ZONE
): DashboardDateRangeBounds {
  const today = formatReportingDay(now, reportingTimeZone)
  const sampleDays = samples.map((sample) => sample.sampleDay).sort()
  const minDay = sampleDays[0] ?? today

  return {
    minDay: minDay > today ? today : minDay,
    maxDay: today,
  }
}
