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

- [ ] Admin TV settings require Clerk admin login and default to Team Overview, Developer Leaderboard, Provider Breakdown, Cursor Budget, and Sync Health slides.
- [ ] Admin can create, rotate, and revoke one active read-only random-token TV display link per team.
- [ ] Rotating the display link invalidates the old link immediately; all TV displays use the same team TV settings.
- [ ] Raw display token is shown once on create/rotate; backend stores only hash, fingerprint, status, created timestamp, and rotated/revoked timestamp.
- [ ] Lost display link requires rotation; existing raw token cannot be re-shown.
- [ ] `/tv` is the admin TV cockpit; `/tv/display/:token` works without Clerk sign-in and returns only TV-safe filtered data.
- [ ] Display token lives in the route path, not a query string.
- [ ] Invalid, revoked, or missing display tokens show `TV link unavailable` with no team/data/setup/owner leak and no redirect to `/tv`.
- [ ] `/tv` shows TV settings plus an inline TV preview on desktop-sized screens, with actions to open or copy the display link.
- [ ] `/tv` and `/tv/display/:token` use the same TV slide renderer; only the surrounding shell differs.
- [ ] `/tv` owns admin settings: drag ordering, enable toggles, per-slide duration inputs, date range, developer visibility, provider visibility, and display-link actions.
- [ ] TV settings changes save immediately and show small `Saved` / `Save failed` states; save failures are not silent.
- [ ] `/tv/display/:token` has no settings panel, but uses admin-configured enabled slides, slide order, per-slide duration, date range, developer visibility, and provider visibility.
- [ ] `/tv/display/:token` keeps read-only playback controls for pause/resume, previous, next, and exit fullscreen on hover or keyboard.
- [ ] Admin TV settings can enable/disable slides, reorder them with dnd-kit, and set per-slide duration with 10 seconds as default.
- [ ] Per-slide duration accepts 5-300 seconds; invalid or empty values show an inline error and do not save.
- [ ] At least one TV slide must stay enabled; UI prevents disabling the last enabled slide and backend validation rejects zero-enabled settings.
- [ ] TV slides and charts stay readable on large wall displays such as 54-inch TVs and still work well on desktop browsers.
- [ ] Each TV slide has one hero metric: Team Overview usage/spend, Developer Leaderboard top developer/top five, Provider Breakdown top provider, Cursor Budget remaining budget, Sync Health freshness status, and Percent Pressure worst active pressure if enabled later.
- [ ] TV supports last 7, last 30, last 90, all time, and custom date ranges with the approved comparison behavior.
- [ ] Cursor Budget slide labels shared pool only when provider-reported pooled fields exist; otherwise it labels summed per-developer values as `Team On-Demand Budget`.
- [ ] Cursor Budget slide headline values are current billing-cycle/provider-window state and do not change when the TV date range changes.
- [ ] Mixed developer billing windows show `Mixed billing windows` and no single reset countdown or cycle pace projection.
- [ ] TV date range affects Cursor budget history, pace, and developer share charts only when daily samples exist.
- [ ] Provider percent usage uses exact percent tiles only; unrelated percent windows are not averaged together.
- [ ] Missing percent data shows coverage, not `0%`.
- [ ] Playback supports auto-rotate, pause/resume, previous, next, and exit fullscreen controls without cluttering the display.
- [ ] If only one slide is enabled, playback controls stay visible but previous, next, and pause/resume are disabled.
- [ ] Every slide shows Updates using the oldest and newest visible data used by that slide, or No data yet.
- [ ] No-data states are quiet placeholders: zero synced team data shows `Waiting for first sync`, missing provider/metric rows show `No data yet`, stale data stays visible with freshness, and previous data with sync errors shows a small `Sync issue`.
- [ ] Enabled slides are not hidden just because they have no data, and normal missing data does not use warning banners.
- [ ] Sync Health uses approved bands: Fresh <=30m, Aging <=4h, Stale <=24h, Offline >24h, Disconnected wins, Never synced shows `No data yet`, active sync errors show `Sync issue`.
- [ ] Freshness uses visible persisted row timestamps only: Team Overview uses visible snapshots and chart samples; Developer Leaderboard uses visible developer/provider snapshots; Provider Breakdown uses visible provider snapshots; Cursor Budget uses visible Cursor snapshots; Sync Health uses visible device `lastSyncAt ?? lastSeenAt`.
- [ ] TV data refresh uses reactive data updates plus a local one-second clock for freshness labels; no timer-based page hard reload.
- [ ] Playback state is memory-only; reload starts from the first enabled slide and auto-plays.
- [ ] Tests cover slide config persistence, order, duration validation, playback state, date range behavior, no-data rows, sync health bands, and freshness formatting.
- [ ] Browser screenshots cover `/tv` cockpit and `/tv/display/:token`, including a large-display TV viewport.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/18
