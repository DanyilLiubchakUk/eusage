# eUsage v1 Admin and TV UX Hardening PRD

This PRD is synthesized only from the current uncommitted documentation changes.

## Problem Statement

Admins and TV viewers need a smoother, safer, and more complete v1 experience before implementation continues.

Current planning left several UX risks unresolved:

- Admin reloads can briefly show `Dashboard unavailable` or `not-authenticated` before real content appears.
- `/tv` behavior was ambiguous: it mixed admin configuration, wall display access, and public access concerns.
- TV settings needed durable controls for slide order, enabled slides, per-slide duration, date range, developer visibility, and provider visibility.
- TV display needed to work well on large 54-inch displays and desktop browsers.
- Cursor pooled budget and per-developer on-demand budget could be mislabeled and misread.
- Provider percent usage could be averaged into misleading blended numbers.
- Settings, Providers, and focused admin pages were underspecified.
- No-data, sync health, and visual proof expectations were not sharp enough for implementation.

## Solution

Build a clean admin and TV UX for eUsage v1:

- Keep `/tv` as the Clerk-protected admin TV cockpit.
- Add `/tv/display/:token` as the read-only wall display route.
- Store only hashed TV display tokens and show raw tokens once on create or rotate.
- Give admins full TV settings control: slide order, enabled slides, per-slide duration, date range, developer visibility, provider visibility, and display-link actions.
- Use the same TV slide renderer for `/tv` preview and `/tv/display/:token`, with different shells.
- Prevent transient auth errors by using a shared admin auth shell that waits for Clerk readiness before fetching page data.
- Make admin navigation complete: Overview, Developers, Providers, TV, and Settings all route to real focused pages.
- Make Settings complete but not overloaded.
- Make Providers management-first with simple provider-only charts.
- Persist Admin and TV date range settings separately.
- Use exact percent tiles instead of blended percent averages.
- Redesign Cursor budget language so true pooled fields are a shared pool, while summed per-developer on-demand fields are `Team On-Demand Budget`.
- Use clear no-data states, sync health bands, one hero metric per TV slide, and visual proof gates.

## User Stories

1. As an admin, I want `/tv` to require admin login, so that only admins can configure TV settings.
2. As an admin, I want `/tv/display/:token` to work without Clerk login, so that a shared TV browser can show slides.
3. As an admin, I want one active TV display link per team, so that shared display access stays simple.
4. As an admin, I want to create a TV display link, so that a TV can be connected quickly.
5. As an admin, I want to rotate a TV display link, so that old links stop working.
6. As an admin, I want to revoke a TV display link, so that TV access can be shut off.
7. As an admin, I want raw display tokens shown only once, so that secrets are not stored or re-shown.
8. As an admin, I want the backend to store only display token hashes and fingerprints, so that leaked database state does not reveal links.
9. As an admin, I want lost display links to require rotation, so that raw tokens are never recovered.
10. As a TV viewer, I want invalid display links to show `TV link unavailable`, so that failures are clear.
11. As a TV viewer, I want invalid display links to avoid leaking team, setup, owner, or data details, so that private usage stays protected.
12. As a TV viewer, I want invalid display links not to redirect to `/tv`, so that I am not sent to admin UI.
13. As an admin, I want `/tv` to show settings and an inline preview on desktop-sized screens, so that I can tune the display in one place.
14. As an admin, I want `/tv` and `/tv/display/:token` to share the same slide renderer, so that preview and display do not drift.
15. As an admin, I want TV settings to autosave, so that changes apply without a separate save flow.
16. As an admin, I want TV settings to show `Saved` and `Save failed`, so that failures are visible.
17. As an admin, I want to reorder TV slides, so that the display fits the room.
18. As an admin, I want to enable or disable TV slides, so that only useful content appears.
19. As an admin, I want at least one TV slide to remain enabled, so that the display never becomes empty.
20. As an admin, I want backend validation to reject zero enabled slides, so that UI bugs cannot break the display.
21. As an admin, I want per-slide duration settings, so that dense slides can stay longer.
22. As an admin, I want default slide duration to be 10 seconds, so that TV works without setup.
23. As an admin, I want per-slide duration to accept 5-300 seconds, so that values stay readable and sane.
24. As an admin, I want invalid duration values to show inline errors and not save, so that bad settings do not silently apply.
25. As a TV viewer, I want pause, resume, previous, next, and exit fullscreen controls, so that live reviews can be controlled.
26. As a TV viewer, I want controls hidden until hover or keyboard, so that the wall display stays clean.
27. As a TV viewer, I want controls visible but disabled when only one slide exists, so that the UI stays predictable.
28. As a TV viewer, I want playback state to be memory-only, so that reload starts cleanly from the first enabled slide.
29. As a TV viewer, I want data to refresh reactively, so that the page does not hard reload on a timer.
30. As a TV viewer, I want freshness labels to update every second, so that the visible age stays accurate.
31. As an admin, I want Admin and TV date ranges persisted separately, so that admin review and wall display can use different ranges.
32. As an admin, I want TV date range to support last 7, last 30, last 90, all time, and custom, so that TV can match team review needs.
33. As an admin, I want custom date ranges persisted as preset plus start and end days, so that reloads keep exact custom windows.
34. As an admin, I want invalid custom date ranges blocked inline, so that settings do not silently reset.
35. As an admin, I want one-off Overview focus filters to stay temporary unless explicitly saved, so that exploration does not mutate defaults.
36. As an admin, I want global provider visibility persisted, so that hidden providers stay hidden from admin views.
37. As an admin, I want TV provider visibility separate from global visibility, so that TV can be curated.
38. As an admin, I want new globally visible providers to be TV-visible by default, so that normal additions show up on the wall.
39. As an admin, I want hidden providers still collected and stored, so that visibility does not affect data retention.
40. As an admin, I want developer creation to include `Add to TV`, checked by default, so that normal teammates appear on TV.
41. As an admin, I want inactive developers hidden from TV even if previously included, so that old users do not stay on wall display.
42. As an admin, I want re-enable to include `Add back to TV`, checked by default, so that returning teammates are easy to restore.
43. As an admin, I want admin pages to use a shared auth shell, so that reloads do not flash false auth errors.
44. As an admin, I want page data to wait until Clerk auth is ready, so that `not-authenticated` does not appear during normal load.
45. As an admin, I want first app load to use a full-page skeleton, so that loading looks intentional.
46. As an admin, I want known admin shell reloads to keep navigation visible, so that only page content skeletons.
47. As an admin, I want Overview, Developers, Providers, TV, and Settings navigation visible on every admin page, so that movement is predictable.
48. As an admin, I want all promised admin nav routes to resolve to real pages, so that I never land on `Not Found`.
49. As an admin, I want Settings to manage team metadata, setup status, owner/recovery info, deployment/debug info, dashboard defaults, TV display-link actions, and safe status links, so that setup operations live in one place.
50. As an admin, I want Settings health checks to show Clerk, Convex, setup sealed state, app URL, and API route status, so that deployment problems are visible.
51. As an admin, I want Settings health checks to expose no secret values, so that config status stays safe.
52. As an admin, I want Settings not to duplicate Developers, Providers, or TV controls, so that focused pages stay clear.
53. As an admin, I want Providers to be management-first, so that visibility, readiness, and setup problems are easy to inspect.
54. As an admin, I want Providers to show reporting developers, last synced data, setup/debug hints, exact percent tiles, and simple provider-only charts, so that provider state is understandable.
55. As an admin, I want Providers to avoid raw payload viewing, dashboard building, and deep cross-provider analytics in v1, so that the page stays small.
56. As an admin, I want Admin Overview to remain a fixed all-up page, so that v1 does not become a dashboard builder.
57. As a TV viewer, I want each TV slide to have one hero metric, so that the display is readable from a distance.
58. As a TV viewer, I want Team Overview to lead with usage and cost, so that the main team signal is clear.
59. As a TV viewer, I want Developer Leaderboard to lead with the top developer and top five list, so that comparison is clear.
60. As a TV viewer, I want Provider Breakdown to lead with top provider, so that provider concentration is clear.
61. As a TV viewer, I want Cursor Budget to lead with remaining budget, so that budget status is clear.
62. As a TV viewer, I want Sync Health to lead with freshness status, so that trust is clear.
63. As a TV viewer, I want TV slides to work on 54-inch displays and desktop browsers, so that the same route works in real rooms and local review.
64. As a TV viewer, I want zero synced data to show `Waiting for first sync`, so that first setup does not look broken.
65. As a TV viewer, I want missing metrics to show `No data yet`, so that absence is explicit.
66. As a TV viewer, I want stale data to remain visible with freshness, so that last known data is not lost.
67. As a TV viewer, I want previous data with sync errors to show a small `Sync issue`, so that errors are visible but not noisy.
68. As a TV viewer, I want enabled slides to stay visible even when empty, so that configured slide order does not mysteriously change.
69. As a TV viewer, I want normal no-data states to avoid warning banners, so that TV does not look broken during normal missing data.
70. As an admin, I want Sync Health to use Fresh, Aging, Stale, Offline, Disconnected, No data yet, and Sync issue labels, so that data trust is scannable.
71. As an admin, I want Sync Health display bands to be stricter than backend device stale state, so that TV trust is clearer without changing device lifecycle.
72. As an admin, I want backend device stale state to remain 72 hours, so that device lifecycle is not too noisy.
73. As an admin, I want Fresh to mean 30 minutes or newer, so that recent syncs are clear.
74. As an admin, I want Aging to mean older than 30 minutes up to 4 hours, so that slightly old data is visible.
75. As an admin, I want Stale to mean older than 4 hours up to 24 hours, so that questionable data is visible.
76. As an admin, I want Offline to mean older than 24 hours, so that likely offline devices are obvious.
77. As an admin, I want Disconnected to win over time bands, so that explicit state is respected.
78. As an admin, I want active sync errors to show `Sync issue`, so that rejection or upload problems do not hide behind age.
79. As an admin, I want Cursor provider-reported pooled fields labeled as shared pool, so that real team pool data is accurate.
80. As an admin, I want summed per-developer Cursor on-demand values labeled `Team On-Demand Budget`, so that individual budgets are not mistaken for one shared pool.
81. As an admin, I want Cursor budget values to preserve provider billing/window scope, so that date filters do not imply false budget ranges.
82. As an admin, I want mixed Cursor billing windows labeled `Mixed billing windows`, so that aggregate on-demand budget is not overexplained.
83. As an admin, I want mixed Cursor billing windows to omit one reset countdown and cycle pace projection, so that false precision is avoided.
84. As an admin, I want Rust/provider extraction to return raw Cursor pooled fields, individual fields, and reset/window fields, so that backend/web metrics choose the right label.
85. As an admin, I want provider percent usage only when reported or safely derived, so that fake percent values are not shown.
86. As an admin, I want providers without percent data shown as coverage gaps, so that missing values are not treated as `0%`.
87. As an admin, I want exact percent tiles such as `Claude 5h`, `Claude weekly`, `Codex session`, `Codex weekly`, `Cursor API`, and `Cursor plan`, so that different windows are not blended.
88. As an admin, I want each percent tile to show average reporting developers, worst developer, coverage, and window label, so that the tile is understandable.
89. As a TV viewer, I want TV to show worst active pressure plus top three exact percent tiles, so that pressure is readable without a full matrix.
90. As an admin, I want Admin to show the full exact-window percent matrix, so that detailed inspection is possible.
91. As a maintainer, I want visual changes to include Admin and TV screenshots, so that reviewers can verify layout.
92. As a maintainer, I want TV visual changes to include a large-display viewport screenshot, so that wall-display readability is proven.
93. As a maintainer, I want metric unit tests from day one for Cursor budget, exact percent tiles, quota coverage, sync health bands, date comparisons, and freshness formatting, so that math does not drift.
94. As a maintainer, I want auth, token, settings, and backend tests where touched, so that UX fixes do not hide contract regressions.
95. As a maintainer, I want macOS and Windows provider proof before ready-for-teammates, so that local setup is proven on both platforms.
96. As a maintainer, I want deployed Vercel, Convex, and Clerk proof before ready-for-teammates, so that local proof is not overclaimed.

## Implementation Decisions

- Shared Admin Auth Shell: centralizes Clerk loading, signed-out, owner check, navigation, and content readiness. Page data waits until auth is ready. First load can use full-page skeleton; known admin shell reloads keep navigation visible.
- Admin Navigation: top-level routes are Overview, Developers, Providers, TV, and Settings. All promised routes must render focused pages.
- Settings Surface: owns team metadata, setup status, owner/recovery info, deployment/debug info, dashboard defaults, TV display-link actions, and safe status links. It does not own developer lifecycle actions, provider readiness management, TV slide settings, raw payload viewing, hard-delete, owner transfer, or setup-token reuse.
- Providers Page: management-first page for global provider visibility, readiness/status, reporting developers, last synced data, setup/debug hints, provider exact percent tiles, and simple provider-only charts. No raw payload viewer, dashboard builder, or deep cross-provider analytics in v1.
- TV Display Link: `/tv` is admin cockpit. `/tv/display/:token` is read-only wall display. Token is in route path, not query string. One active display link per team. Raw token shown once. Backend stores hash, fingerprint, status, and timestamps only. Rotate invalidates old link. Revoke disables current link.
- TV Settings Model: stores enabled slides, slide order, per-slide duration, date range, developer visibility, provider visibility, and display-link status/actions. Settings autosave and surface small success/failure states.
- TV Slide Engine: resolves enabled slides, order, duration, playback state, visible data, no-data labels, freshness timestamps, and one-hero-metric layout. `/tv` preview and `/tv/display/:token` use the same renderer.
- TV Playback: auto-rotates, supports pause/resume/previous/next/exit fullscreen, hides controls until hover or keyboard, disables controls for one-slide mode, and keeps playback state memory-only.
- Date Range Settings: Admin date range persists in `dashboardSettings`; TV date range persists in `tvSettings`. Custom range persists as preset plus start and end days. Invalid ranges are blocked inline.
- Visibility Resolver: applies global provider visibility, TV provider visibility, developer TV visibility, inactive developer rules, date ranges, and dashboard filters. Hidden providers still collect and store data. Inactive developers hide from TV.
- Developer TV Defaults: developer creation has `Add to TV`, checked by default. Re-enable has `Add back to TV`, checked by default.
- Provider TV Defaults: new globally visible providers are TV-visible by default.
- Cursor Budget Calculator: uses provider-reported pooled fields as shared pool. If pooled fields are missing, returns `Team On-Demand Budget` from per-developer on-demand values. Excludes missing limits with coverage. Detects mixed billing windows and omits single reset countdown or cycle pace projection.
- Cursor Provider Extraction Contract: Rust/provider extraction returns raw pooled fields, individual on-demand fields, and reset/window fields when available. It does not pre-label summed on-demand values as a shared pool.
- Exact Percent Tile Calculator: produces separate percent tiles per provider metric/window. It does not average unrelated windows together. Each tile returns average across reporting developers, worst developer, coverage, and window/scope label.
- Sync Health Presenter: derives display bands from `lastSyncAt ?? lastSeenAt`, explicit disconnected state, never-synced state, and active sync errors. Display bands do not replace 72-hour backend device stale lifecycle.
- No-Data Presenter: returns `Waiting for first sync`, `No data yet`, stale-with-freshness, or `Sync issue` states. Enabled TV slides remain visible when empty.
- TV Visual System: each slide gets one hero metric. Supporting rows and tables are visually secondary. Layout must hold at large-TV and desktop sizes.
- Visual Proof Gate: affected Admin and TV routes need browser screenshots. TV changes need a large-display viewport screenshot.
- Ready-for-Teammates Gate: metric/backend tests, macOS proof, Windows proof, and deployed Vercel/Convex/Clerk proof are required before claiming ready.

## Testing Decisions

- Tests should verify external behavior and contracts, not implementation details.
- Metric functions should be pure and tested in isolation.
- Cursor Budget Calculator tests should cover provider pooled fields, on-demand aggregate, missing limit coverage, explicit used vs limit-minus-remaining fallback, mixed billing windows, and no false shared-pool label.
- Exact Percent Tile Calculator tests should cover separate provider/window tiles, coverage counts, worst developer, missing percent exclusion, and no blended unrelated averages.
- Sync Health Presenter tests should cover Fresh, Aging, Stale, Offline, Disconnected, No data yet, and Sync issue labels, separate from the 72-hour backend stale lifecycle.
- Date Range tests should cover persisted Admin and TV ranges, custom ranges, invalid ranges, previous equal-length comparisons, and all-time no-delta.
- Visibility Resolver tests should cover global provider visibility, TV provider visibility, default-visible providers, Add to TV developer defaults, inactive developer hiding, and hidden provider storage.
- TV Slide Engine tests should cover enabled slides, cannot disable all slides, order, per-slide duration validation, one-slide disabled controls, no-data labels, freshness source selection, and memory-only playback restart.
- Admin Auth Shell tests should cover Clerk loading, signed-out, not-owner, ready state, no transient `not-authenticated` error, and skeleton behavior.
- TV Display Link tests should cover raw token shown once, hash-only storage, fingerprint status, rotate invalidation, revoke, invalid token unavailable state, and no data/setup/owner leakage.
- Providers page tests should cover management-first fields, exact percent tile rendering, simple provider-only chart rendering, and absence of raw payload UI.
- Settings page tests should cover safe environment health without secrets and no false error flash while loading.
- Visual review should include browser screenshots for affected Admin pages and TV pages.
- TV visual review should include a large-display viewport screenshot and a desktop viewport screenshot.
- Provider/platform readiness still needs manual macOS and Windows checks because automated tests cannot prove local provider login, path availability, Windows tray behavior, or credential manager behavior.

## Out of Scope

- Fully public unauthenticated `/tv`.
- Multiple active TV display links per team.
- Re-showing raw TV display tokens after creation or rotation.
- Developer login with Clerk.
- Multi-admin roles.
- Owner transfer UI.
- Setup-token reuse after bootstrap.
- Raw payload viewer in Admin.
- Hard-delete usage UI.
- Admin dashboard drag/drop builder.
- Deep cross-provider analytics inside Providers page.
- Manual Cursor budget override UI.
- Single blended quota pressure score across unrelated percent windows.
- Per-device usage charts.
- Persistent local upload queue.
- Windows ARM64 support.
- Signed Windows installer.

## Further Notes

- This PRD intentionally covers only uncommitted planning changes. It does not restate every existing v1 requirement.
- Device Status and Sync Health are separate terms. Device Status keeps the 72-hour stale lifecycle. Sync Health uses stricter display bands for trust.
- Cursor Pool and Cursor On-Demand Budget are separate terms. Only provider-reported pooled fields can be called a shared pool.
- TV display links are public-by-link, not fully public. Admin settings remain Clerk-protected.
- The implementation should stay small. This app is for small internal teams, not enterprise admin complexity.
