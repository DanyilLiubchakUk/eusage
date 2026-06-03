# [AFK] Sync Cursor source facts end to end

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/14

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

35, 38, 51, 58, 62, 68, 70

## What to build

Make Cursor the first real provider slice: extract Cursor source facts and metric samples on desktop, upload them through team sync, store them in Convex, and show Cursor budget data in Admin and TV.

## Acceptance criteria

- [ ] Cursor extractor emits normalized summary fields, metric samples, summary version, extractor version, and redacted payload shape.
- [ ] Cursor source facts include plan usage, API percent, on-demand individual fields, pooled fields when present, reset dates, billing/window fields when available, and plan name when available.
- [ ] Admin shows a developer Cursor row with budget fields, token status, and device sync status.
- [ ] TV shows the Cursor budget proof using provider-reported pooled fields or the approved `Team On-Demand Budget` aggregate.
- [ ] Only provider-reported pooled fields are labeled as a shared Cursor pool.
- [ ] Cursor budget headline values are labeled as current billing-cycle/provider-window values and do not change with Admin/TV date range filters.
- [ ] Mixed developer billing windows show `Mixed billing windows` and no single reset countdown or cycle pace projection.
- [ ] Missing Cursor on-demand limits are excluded from aggregate totals and counted in a small missing-data note.
- [ ] Tests cover Cursor extraction, redaction, pooled source priority, on-demand aggregate used calculation, mixed billing windows, missing limits, and Windows path candidates where practical.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/13
