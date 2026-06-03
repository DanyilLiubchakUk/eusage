import { formatUtcDay, type UsageMetricSampleSourceRow } from "../../lib/metrics"

export type DashboardDateRangeBounds = {
  minDay: string
  maxDay: string
}

export function buildDashboardDateRangeBounds(
  samples: UsageMetricSampleSourceRow[],
  now: number
): DashboardDateRangeBounds {
  const today = formatUtcDay(now)
  const sampleDays = samples.map((sample) => sample.sampleDay).sort()
  const minDay = sampleDays[0] ?? today

  return {
    minDay: minDay > today ? today : minDay,
    maxDay: today,
  }
}
