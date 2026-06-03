# [AFK] Calculate shared dashboard metrics from source rows

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/10

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

24, 25, 26, 40, 41, 66, 67

## What to build

Create the shared metric layer used by Admin and TV. It converts stored source rows into totals, date comparisons, exact percent tiles, Cursor pool/on-demand budget values, chart inputs, and update freshness labels.

## Acceptance criteria

- [ ] Shared pure metric functions calculate totals, averages, percent changes, and chart-ready series from source rows.
- [ ] Date ranges support last 7, last 30, last 90, all time, and custom with the approved comparison rules.
- [ ] Cursor budget uses provider-reported pooled fields when present; otherwise it returns a `Team On-Demand Budget` aggregate from per-developer on-demand values.
- [ ] Summed per-developer on-demand budget is not labeled as a shared pool.
- [ ] Cursor pool/on-demand budget headline values stay current billing-cycle/provider-window values and are not altered by Admin/TV date range filters.
- [ ] Date range affects Cursor budget history, pace, and developer share charts only when daily samples exist.
- [ ] Mixed developer billing windows return `Mixed billing windows` metadata and no single reset countdown or cycle pace projection.
- [ ] Quota pressure uses exact percent tiles and excludes missing reports with coverage counts.
- [ ] Provider percent usage is included only when reported or safely derived from provider limit/remaining values; missing percent data is coverage, not zero.
- [ ] Sync health band calculation returns Fresh, Aging, Stale, Offline, Disconnected, No data yet, and Sync issue labels using the approved thresholds.
- [ ] Update freshness formatting reports no-data, one timestamp, or oldest/newest timestamps while omitting leading zero units.
- [ ] Admin and TV placeholder views use the shared functions instead of inline React math.
- [ ] Tests cover Cursor pooled source priority, on-demand budget aggregate, mixed billing windows, exact percent tiles, quota coverage, sync health bands, date-range comparison, all-time no delta, and freshness formatting.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/9
