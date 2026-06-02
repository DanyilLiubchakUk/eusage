# [AFK] Build TV slides, settings, playback, and freshness

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/20

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41

## What to build

Build the protected TV display mode with default slides, date range settings, slide order/duration controls, playback controls, update freshness labels, and readable no-data states.

## Acceptance criteria

- [ ] TV mode requires admin login and defaults to Team Overview, Developer Leaderboard, Provider Breakdown, Cursor Pool, and Sync Health slides.
- [ ] Admin TV settings can enable/disable slides, reorder them with dnd-kit, and set per-slide duration with 10 seconds as default.
- [ ] TV supports last 7, last 30, last 90, all time, and custom date ranges with the approved comparison behavior.
- [ ] Playback supports auto-rotate, pause/resume, previous, next, and exit fullscreen controls without cluttering the display.
- [ ] Every slide shows Updates using the oldest and newest visible data used by that slide, or No data yet.
- [ ] Freshness uses visible persisted row timestamps only: Team Overview uses visible snapshots and chart samples; Developer Leaderboard uses visible developer/provider snapshots; Provider Breakdown uses visible provider snapshots; Cursor Pool uses visible Cursor snapshots; Sync Health uses visible device `lastSyncAt ?? lastSeenAt`.
- [ ] Tests cover slide config persistence, order, duration validation, playback state, date range behavior, no-data rows, and freshness formatting.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/18
