# [AFK] Build Admin Overview charts and metric tables

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/19

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

24, 25, 26, 27, 28, 29, 56, 57

## What to build

Turn the Admin Overview into the fixed all-up analytics page using real stored provider data, shared metrics, filters, Chart.js charts, compact tables, and metric tooltips.

## Acceptance criteria

- [ ] Overview includes KPI strip, team usage over time, developer leaderboard, provider breakdown, Cursor pool, sync health, and compact tables.
- [ ] The KPI strip defaults to team spend/usage, active developers, top provider, sync health, and Cursor pool remaining.
- [ ] Top Developers, Provider Status, Recent Syncs, and Available Metrics tables render from source rows and shared metrics.
- [ ] Metric tooltips explain meaning, source, unit, coverage, date range, and estimated/provider-reported status.
- [ ] Overview widgets are fixed and do not introduce dashboard-builder drag/drop behavior.
- [ ] Tests cover no-data states, filters, tooltip content, leaderboard default metric, and compact table values.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/18
