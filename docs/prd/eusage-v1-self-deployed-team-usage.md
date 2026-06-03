# PRD: eUsage v1 Self-Deployed Team Usage

## Problem Statement

Teams use several AI coding tools, but usage is scattered across local apps, CLIs, provider dashboards, and hidden quota files. The team cannot easily compare developer usage, provider usage, budget pressure, sync health, or Cursor budget status in one place.

The product must work for a small internal team, usually 2-5 people. It must be self-deployed by each team, not run as a central SaaS. It must work on macOS and Windows. It must give admins a good setup and management flow, while developers only need a simple desktop app and one connection string.

## Solution

Build eUsage as an open-source, self-deployed product where each team deploys its own web app, Convex project, and Clerk app.

Admins sign in with Clerk, claim the deployment once with a setup token, create developer records, generate per-developer tokens, and manage dashboard and TV settings. Developers install the desktop app on macOS or Windows, paste one connection string, and the desktop app sends local provider usage to the team's deployment.

The web app stores source facts in Convex and calculates dashboard metrics in shared pure functions. Admin and TV views reuse the same metric layer. The first complete slice is Cursor, then Codex, Claude, and JetBrains AI Assistant. v1 is done only when those four providers work locally on both macOS and Windows and real data appears in Admin and TV.

## User Stories

1. As an admin, I want to fork and deploy eUsage for my team, so that my team owns its own data and hosting.
2. As an admin, I want a day-one setup flow, so that I can claim a new deployment without editing the database.
3. As an admin, I want to use Clerk for admin login, so that I do not manage passwords myself.
4. As an admin, I want the setup token to work only before bootstrap, so that it cannot reset ownership later.
5. As an admin, I want one owner in v1, so that the management model stays simple.
6. As an admin, I want manual owner recovery documented, so that loss of Clerk access has a clear technical path.
7. As an admin, I want to create a developer record, so that usage can be tied to the right person.
8. As an admin, I want to add developer name, email, token label, and metadata, so that tokens are easy to distinguish later.
9. As an admin, I want each developer to have their own token, so that I can revoke or rotate one person without breaking the team.
10. As an admin, I want raw tokens shown once, so that secrets are not visible after creation.
11. As an admin, I want to see token fingerprint and status later, so that I can identify the token without seeing the secret.
12. As an admin, I want to rotate a developer token, so that I can replace a leaked or lost token.
13. As an admin, I want old tokens revoked immediately on rotation, so that old credentials stop working.
14. As an admin, I want to revoke a developer token, so that all that developer's devices stop syncing.
15. As an admin, I want inactive developers kept in Admin history, so that old usage remains reviewable.
16. As an admin, I want inactive developers hidden from TV by default, so that TV stays focused on active teammates.
17. As an admin, I want to re-enable an inactive developer by issuing a new token, so that the person can sync again.
18. As an admin, I want to archive stale duplicate devices, so that operational lists stay clean without deleting usage.
19. As an admin, I want no hard-delete usage UI in v1, so that accidental clicks cannot destroy history.
20. As an admin, I want global provider visibility, so that I can hide a provider from all views while still collecting data.
21. As an admin, I want separate TV provider visibility, so that TV can be curated differently from Admin.
22. As an admin, I want all developers visible in Admin filters, so that review is complete.
23. As an admin, I want separate TV developer visibility, so that wall display can be curated.
24. As an admin, I want developer creation to include an Add to TV checkbox that defaults on, so that most teammates appear on TV while exceptions stay easy.
25. As an admin, I want date filters for last 7, 30, 90, all time, and custom, so that I can review different windows.
26. As an admin, I want equal-length previous range comparisons, so that percentages are predictable.
27. As an admin, I want no percent delta for all-time, so that the metric is not misleading.
28. As an admin, I want an Overview page with KPI strip, charts, tables, Cursor budget, and sync health, so that I can understand the team quickly.
29. As an admin, I want focused Developers, Providers, TV, and Settings pages, so that management actions are easy to find.
30. As an admin, I want fixed Overview widgets in v1, so that the product does not become a dashboard builder too early.
31. As an admin, I want TV slide order and duration settings, so that the display fits the room.
32. As an admin, I want TV slides enabled or disabled, so that I can control what the team sees.
33. As an admin, I want TV default slide duration to be 10 seconds, so that it works without setup.
34. As an admin, I want TV pause, resume, previous, next, and exit controls, so that I can drive reviews live.
35. As an admin, I want TV settings behind admin login and a revokable read-only TV display link, so that shared displays work without exposing admin controls.
36. As a TV viewer, I want a Team Overview slide, so that I can see team usage, cost, active developers, top provider, Cursor budget, and sync health at a glance.
37. As a TV viewer, I want a Developer Leaderboard slide, so that I can compare teammates.
38. As a TV viewer, I want a Provider Breakdown slide, so that I can see where usage happens.
39. As a TV viewer, I want a Cursor Budget slide, so that I can see shared pool or on-demand budget health.
40. As a TV viewer, I want a Sync Health slide, so that I can trust or question the data.
41. As a TV viewer, I want every slide to show oldest update age, so that I know how stale the data is.
42. As a TV viewer, I want missing metric rows to stay visible as "No data yet", so that absence is explicit.
43. As a developer, I want one connection string, so that setup is copy/paste.
44. As a developer, I want the connection string to include only team URL and developer token, so that there are fewer fields to misconfigure.
45. As a developer, I want the app to confirm the team name from the server, so that I know I connected to the right deployment.
46. As a developer, I want the raw team token stored in OS credential storage, so that it is not saved in plain config.
47. As a developer, I want to disconnect locally, so that another person can use the same laptop later.
48. As a developer, I want local disconnect to work offline, so that I can remove credentials even without network.
49. As a developer, I want no automatic reconnect after disconnect, so that disconnect is final.
50. As a developer, I want provider cards to keep showing local data when team sync fails, so that local app remains useful.
51. As a developer, I want team sync failures shown separately from provider failures, so that I know what actually broke.
52. As a developer, I want explicit Cursor states for setup needed, signed out, and unreadable, so that I know how to fix it.
53. As a Windows developer, I want eUsage in the taskbar tray corner or overflow, so that it feels like a normal Windows tray app.
54. As a Windows developer, I want first-run tray guidance, so that I know where the app went.
55. As a macOS developer, I want eUsage in the menu bar, so that current behavior remains native.
56. As a developer with multiple machines, I want the same developer token to work on multiple devices, so that setup stays simple.
57. As an admin, I want device status under each developer, so that I can see stale or disconnected desktops.
58. As an admin, I want dashboard totals per developer, not per device, so that one person is not split across machines.
59. As an admin, I want latest device snapshot to win for overlapping account-level periods, so that multiple devices do not double count usage.
60. As an admin, I want all normalized history retained, so that all-time charts work.
61. As an admin, I want raw payloads kept only 90 days, so that debugging is possible without keeping large raw data forever.
62. As an admin, I want rejected provider payload errors kept with expiry, so that debugging does not become permanent log storage.
63. As a maintainer, I want provider source fact extraction tested at the plugin boundary, so that dashboard data stays stable.
64. As a maintainer, I want backend ingest to reject only the bad provider in a batch, so that one broken provider does not block the rest.
65. As a maintainer, I want each batch to include an upload schema version, so that desktop/backend compatibility errors are clear.
66. As a maintainer, I want summary and extractor versions stored with data, so that old normalized rows can be understood later.
67. As a maintainer, I want derived metrics in shared pure functions, so that Admin and TV do not drift.
68. As a maintainer, I want source facts stored, not duplicate calculated values, so that data stays clean.
69. As a maintainer, I want provider path logic owned by plugins, so that Windows support can be added per provider.
70. As a maintainer, I want bundled SQLite for Windows provider reads, so that users do not install SQLite manually.
71. As a maintainer, I want v1 release readiness to require real macOS and Windows desktops, so that teammate setup is proven.

## Implementation Decisions

- Deployment model: each team runs one self-deployed app with one Convex Cloud project, one Clerk app, and one Vercel project. One deployment contains one team.
- Admin auth: Clerk is only for admins. Developer desktop sync does not use Clerk.
- Setup bootstrap: a deploy-time setup token claims the first owner. After setup, the setup route shows complete state and cannot accept the token again.
- Owner model: v1 has one owner. Owner recovery is manual through deployment/database operations.
- Developer auth: each developer has one current managed token. Raw tokens are generated by the app, shown once, hashed with SHA-256, and later identified by fingerprint.
- Developer lifecycle: revoking a token makes the developer inactive. Re-enabling creates a new token and marks the developer active.
- Device lifecycle: each desktop install has a random device ID. Device status is connected, stale, disconnected, or archived. Stale means no successful check-in for 72 hours.
- Sync Health display: Fresh means 30 minutes or newer, Aging means older than 30 minutes up to 4 hours, Stale means older than 4 hours up to 24 hours, Offline means older than 24 hours, Disconnected wins over time, Never synced shows `No data yet`, and active sync errors show a small `Sync issue`.
- Multiple devices: a developer token can be used on multiple devices. Dashboard usage is grouped by developer. For overlapping developer/provider/period rows, latest device snapshot wins in v1.
- Desktop connection: connection strings contain only team app URL and developer token. Desktop discovers safe metadata from the public team config endpoint.
- Secret storage: desktop stores raw developer token in macOS Keychain or Windows Credential Manager. Normal config stores only team URL, team name, token fingerprint, and device ID.
- Desktop API: desktop calls versioned web app routes for team config, device check-in, usage batch, and device disconnect. Authenticated routes use bearer token auth.
- Admin/TV data path: Admin uses Clerk-authenticated Convex functions directly. `/tv` is the admin-only TV cockpit. `/tv/display/:token` is the read-only wall-display route; token lives in the route path, not a query string. Each team has one active read-only TV display link in v1. Read-only TV display links use a random token and return only TV-safe filtered data. Invalid or revoked display links show an unavailable state without leaking team/data/setup details or redirecting to `/tv`. Raw display tokens are shown once on create/rotate; backend stores only hash, fingerprint, status, and timestamps. Desktop never calls Convex directly.
- Upload contract: every usage batch includes upload schema version, redacted provider payloads, normalized source facts, metric samples, summary version, and per-provider extractor version.
- Partial acceptance: backend validates provider payloads independently. Valid providers are accepted. Bad providers are rejected, listed in the response, and logged as short-lived sync errors.
- Raw payload policy: raw redacted provider payloads are retained 90 days. Normalized snapshots and metric samples are retained for all-time reporting.
- Data model: use normalized tables for teams, admins, developers, developer tokens, devices, providers, usage snapshots, raw payloads, metric samples, audit events, sync errors, dashboard settings, and TV settings.
- Usage snapshot policy: usage snapshots are upserted by team, developer, device, provider, period key, and data identity. Same data overwrites the latest row. v1 does not store immutable upload history.
- Metric sample policy: daily source metric samples power trends, burn, pace, comparisons, and charts. They are source measurements, not precomputed chart aggregates.
- Metric engine: shared pure TypeScript functions calculate totals, averages, date comparisons, Cursor pool/on-demand budget, exact percent tiles, quota pressure, projections, chart aggregates, and update freshness labels.
- Date logic: last 7, last 30, last 90, and custom compare with previous equal-length range. All-time has no percent delta.
- Date range persistence: Admin date range is saved in `dashboardSettings`; TV date range is saved in `tvSettings`; reloads keep saved ranges.
- Custom date ranges persist as preset plus `startDay` and `endDay`; invalid ranges are blocked inline and do not silently reset to default.
- Filter persistence: date range, global provider visibility, TV visibility, and dashboard defaults persist. One-off Admin Overview focus filters stay temporary unless explicitly saved as settings.
- Visibility logic: provider disable hides from all views but still collects data. New globally visible providers are TV-visible by default. TV visibility is an extra layer over global visibility. Admin can always review developers, including inactive when selected. Inactive developers are hidden from TV even if previously included. Re-enable includes `Add back to TV`, checked by default.
- Admin UI: top navigation is Overview, Developers, Providers, TV, Settings. The same navigation is visible on every admin page, and every promised nav route resolves to a real focused page instead of `Not Found`. Admin routes use a shared auth shell; page data waits until Clerk auth is ready, so reloads show a quiet loading state instead of transient `Dashboard unavailable` or `not-authenticated` errors. First app load can use a full-page skeleton; after the admin shell is known, keep nav visible and skeleton only page content. Overview is dense and fixed. Focused pages contain controls. Providers is management-first, with global provider visibility, provider readiness/status, reporting developers, last synced data, setup/debug hints, exact percent tiles for that provider, and simple provider-only charts. Providers v1 does not include raw payload viewing, a dashboard builder, or deep cross-provider analytics. Settings manages team metadata, setup status, owner/recovery info, deployment/debug info, dashboard defaults, TV display-link status/actions, and safe links/status for focused workflows. Settings health checks show configured/missing status for Clerk, Convex, setup sealed state, app URL, and API routes without exposing secret values.
- TV UI: `/tv` is the admin TV cockpit with settings, drag ordering, enable toggles, per-slide duration inputs, visibility controls, inline preview on desktop-sized screens, and actions to open or copy the display link. TV settings changes save immediately and show small `Saved` / `Save failed` states. `/tv` and `/tv/display/:token` use the same TV slide renderer; only the surrounding shell differs. Default slides are Team Overview, Developer Leaderboard, Provider Breakdown, Cursor Budget, and Sync Health. At least one TV slide must stay enabled. Slides auto-rotate, use configured per-slide duration, and show oldest and newest visible update ages. Per-slide duration accepts 5-300 seconds and defaults to 10 seconds. `/tv/display/:token` has no settings panel, but uses the admin-configured slide settings and keeps read-only playback controls on hover or keyboard. If only one slide is enabled, previous, next, and pause/resume controls are disabled. TV data refresh uses reactive data updates plus a local one-second clock for freshness labels; it does not hard-reload on a timer. Playback state is memory-only; reload starts from the first enabled slide and auto-plays. No-data states are quiet and explicit: zero synced data shows `Waiting for first sync`, missing metrics show `No data yet`, stale data remains visible with freshness, and previous data with sync errors shows a small `Sync issue`.
- TV layout: slides and charts must stay readable on large wall displays such as 54-inch TVs and still work well on desktop browsers. Each slide uses one hero metric: Team Overview usage/spend, Developer Leaderboard top developer/top five, Provider Breakdown top provider, Cursor Budget remaining budget, Sync Health freshness status, and Percent Pressure worst active pressure if enabled later.
- Chart catalog: support developer over-time comparison, team total over time, provider breakdown, provider trends, leaderboard, usage-limit pressure, and Cursor pool/on-demand budget across Admin Overview, TV cockpit, TV display, and focused admin pages where useful.
- Cursor budget: use provider-reported pooled fields when present. Otherwise show `Team On-Demand Budget` from summed per-developer on-demand limits and usage. Exclude missing limit data and show coverage. Only provider-reported pooled fields are labeled as a shared pool. Headline values are current billing-cycle/provider-window values and are not changed by the selected Admin/TV date range; date range only affects budget history, pace, and developer share charts when daily samples exist. If summed on-demand budget includes mixed developer billing windows, show `Mixed billing windows` and no single reset countdown or cycle pace projection.
- Quota pressure: use exact percent tiles such as `Claude 5h`, `Claude weekly`, `Codex session`, `Codex weekly`, `Cursor API`, and `Cursor plan`; unrelated percent windows are not averaged together. Each tile can show average across visible reporting developers, worst developer, coverage, and window/scope label. TV shows worst active pressure plus the top three exact percent tiles. Admin can show the full exact-window matrix/table. Warning is 80 percent. Critical is 95 percent. Provider percent usage appears only when reported or safely derived from provider limit/remaining data; missing percent data is shown as coverage, not `0%`.
- Provider scope: v1 required providers are Cursor, Codex, Claude, and JetBrains AI Assistant on macOS and Windows x64.
- Provider order: Cursor first, then Codex, Claude, then JetBrains AI Assistant.
- Windows scope: Windows v1 uses an unsigned x64 installer first. Windows ARM64 and code signing are future work.
- Windows shell: Windows uses a tray popup near taskbar corner or overflow. The app explains tray overflow on first run and does not force OS tray pinning.
- Provider platform paths: plugins own provider-specific macOS and Windows path candidates. The host provides generic file, credential, environment, HTTP, and SQLite abilities.
- Windows SQLite: bundle SQLite for Windows provider database reads so users do not install it manually.
- Local dev: use one web/backend command and one desktop command. Web tests run with a separate command.
- Build order: build the web/backend first, Windows shell second, cross-OS team sync/provider functionality third, and polished UI after real data works.

## Deep Modules

- Upload Contract Validator: validates batch version, provider payload shape, source facts, metric samples, summary version, extractor version, and redaction status.
- Token Auth Service: creates long random developer tokens, hashes raw tokens, verifies bearer tokens, returns developer identity, and updates last-used metadata.
- Developer Lifecycle Manager: owns create, metadata edit, token rotate, token revoke, inactive state, and re-enable flows.
- Device Status Manager: owns check-in, disconnect, stale detection, archive, and device metadata updates.
- Desktop Team Sync Manager: parses connection strings, stores credentials, debounces batches, retries in memory, flushes on quit, and separates sync status from provider status.
- Provider Source Fact Extractors: convert provider-specific local data into normalized source facts and daily metric samples.
- Redaction Engine: strips obvious secret fields before upload and supports plugin tests.
- Metric Engine: converts stored source rows into Admin and TV view models.
- Date Range Comparator: normalizes presets, custom ranges, previous-range comparison, and all-time behavior.
- Visibility Resolver: applies global provider visibility, TV provider visibility, developer filters, inactive rules, and selected date range.
- Cursor Budget Calculator: handles pooled source fields, per-developer on-demand aggregate, missing limit coverage, mixed billing-window labels, and date-range history/pace inputs.
- TV Slide Engine: resolves enabled slides, order, duration, playback state, and visible update timestamps per slide.
- Freshness Formatter: formats ages as seconds, minutes/seconds, hours/minutes/seconds, or days/hours/minutes/seconds.

## Testing Decisions

- Tests should verify external behavior and contracts, not internal implementation details.
- Metric engine tests are required from day one for Cursor pool/on-demand budget, exact percent tiles, quota coverage, date range comparison, sync health bands, and update freshness formatting.
- Upload validator tests should prove valid providers are accepted, invalid providers are rejected independently, and sync errors contain no secrets.
- Token auth tests should prove raw token is shown once, only the hash is stored, bearer auth maps to the correct developer, and revoked/inactive tokens fail.
- Connection parser tests should accept valid production and localhost connection strings and reject missing URL, missing token, wrong scheme, and unsafe URLs.
- Desktop sync tests should prove 30 second debounce replacement behavior, memory-only retry, invalid token disconnect, and quit flush timeout behavior.
- Redaction tests should cover token, access token, refresh token, secret, API key, cookie, authorization, password, credential, and exact secret-key field variants.
- Provider extractor tests are required per v1 provider for normalized source facts, metric samples, summary version, extractor version, upload schema version, and redacted payload shape.
- Cursor tests should cover plan usage, on-demand fields, pooled fields, per-user fallback, missing on-demand limit, and Windows path candidate handling where practical.
- Date and visibility tests should cover hidden providers still being stored, inactive developers hidden from TV by default, Admin show-inactive behavior, and all-time no-delta behavior.
- TV tests should cover slide ordering, enable/disable, per-slide duration, pause/resume, update freshness source, no-data labels, and large-display screenshots.
- Visual/UX proof should include browser screenshots for Admin and TV plus a TV large-display viewport screenshot before visual changes are considered done.
- Convex/backend tests should cover snapshot upsert keys, metric sample upsert keys, raw payload expiry fields, sync error expiry fields, and safe team-config response.
- Windows release proof still needs manual checks. Automated tests cannot prove real tray behavior, Windows Credential Manager, provider app login state, or real provider path availability.

## Out of Scope

- Central eUsage SaaS.
- Multiple teams or organizations inside one deployment.
- Multi-admin roles.
- Fully public unauthenticated `/tv`.
- Owner transfer UI.
- Setup token reuse after bootstrap.
- Developer login with Clerk.
- Hard-delete usage UI.
- Developer merge UI.
- Per-device usage charts.
- Persistent local upload queue.
- Raw payload viewer in Admin.
- Manual Cursor budget override UI.
- Windows ARM64 support.
- Signed Windows installer.
- Full provider parity beyond Cursor, Codex, Claude, and JetBrains AI Assistant.
- Docker Compose as the official v1 path.

## Further Notes

Primary data flow:

1. Admin deploys app, Convex, and Clerk.
2. Admin claims setup with setup token and Clerk.
3. Admin creates developer and token.
4. Developer pastes connection string into desktop.
5. Desktop stores token in OS credential storage and checks team config.
6. Desktop probes providers on the normal refresh/manual refresh path.
7. Provider extractors produce redacted payloads, source facts, and metric samples.
8. Desktop batches successful provider results and uploads to the team app.
9. Web API validates token and upload contract, then writes to Convex.
10. Convex stores source rows. Shared metric functions calculate display values.
11. Admin and TV show the same underlying metrics with different layouts and visibility rules.

This PRD is ready for implementation slicing. The first slice should prove Cursor end to end with real data before dashboard polish.
