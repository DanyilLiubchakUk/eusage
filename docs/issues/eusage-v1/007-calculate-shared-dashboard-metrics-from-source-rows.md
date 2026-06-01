# [AFK] Calculate shared dashboard metrics from source rows

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/10

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

24, 25, 26, 40, 41, 66, 67

## What to build

Create the shared metric layer used by Admin and TV. It converts stored source rows into totals, date comparisons, quota pressure, Cursor pool fallback values, chart inputs, and oldest-update labels.

## Acceptance criteria

- [ ] Shared pure metric functions calculate totals, averages, percent changes, and chart-ready series from source rows.
- [ ] Date ranges support last 7, last 30, last 90, all time, and custom with the approved comparison rules.
- [ ] Quota pressure excludes missing reports and returns coverage counts.
- [ ] Oldest-update formatting omits leading zero units and returns no-data text when needed.
- [ ] Admin and TV placeholder views use the shared functions instead of inline React math.
- [ ] Tests cover Cursor pool fallback, quota coverage, date-range comparison, all-time no delta, and freshness formatting.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/9
