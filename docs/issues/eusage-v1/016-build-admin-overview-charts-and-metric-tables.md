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

- [ ] Overview includes KPI strip, team usage over time, developer leaderboard, provider breakdown, Cursor budget, sync health, and compact tables.
- [ ] The KPI strip defaults to team spend/usage, active developers, top provider, sync health, and Cursor budget remaining.
- [ ] Cursor budget remaining is labeled as shared pool only when provider-reported pooled fields exist; otherwise it is labeled `Team On-Demand Budget`.
- [ ] Cursor budget headline values are current billing-cycle/provider-window state and do not change when the Admin date range changes.
- [ ] Mixed developer billing windows show `Mixed billing windows` and no single reset countdown or cycle pace projection.
- [ ] Provider percent usage and quota pressure use exact percent tiles only; unrelated percent windows are not averaged together.
- [ ] Missing percent data shows coverage, not `0%`.
- [ ] Top Developers, Provider Status, Recent Syncs, and Available Metrics tables render from source rows and shared metrics.
- [ ] Sync health uses approved bands: Fresh <=30m, Aging <=4h, Stale <=24h, Offline >24h, Disconnected wins, Never synced shows `No data yet`, active sync errors show `Sync issue`.
- [ ] Metric tooltips explain meaning, source, unit, coverage, date range, and estimated/provider-reported status.
- [ ] Overview widgets are fixed and do not introduce dashboard-builder drag/drop behavior.
- [ ] Admin pages share the same top navigation for Overview, Developers, Providers, TV, and Settings.
- [ ] Promised admin nav routes resolve to real focused pages instead of `Not Found`.
- [ ] Providers page is management-first with global provider visibility, readiness/status, reporting developers, last synced data, setup/debug hints, exact percent tiles for that provider, and simple provider-only charts.
- [ ] Providers page does not include raw payload viewer, dashboard builder, or deep cross-provider analytics in v1.
- [ ] Settings provides team metadata, setup status, owner/recovery info, deployment/debug info, dashboard defaults, TV display-link status/actions, and safe links/status for focused workflows.
- [ ] Settings health checks show configured/missing status for Clerk, Convex, setup sealed state, app URL, and API routes without exposing secret values.
- [ ] Settings does not duplicate focused actions from Developers, Providers, or TV.
- [ ] Admin page data waits until Clerk auth is ready and shows a quiet loading state instead of transient `not-authenticated` errors on reload.
- [ ] First app load may use a full-page skeleton; after the admin shell is known, keep nav visible and skeleton only page content.
- [ ] Tests cover no-data states, filters, sync health bands, tooltip content, leaderboard default metric, and compact table values.
- [ ] Browser screenshots cover Admin Overview and focused Providers page after visual changes.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/18
