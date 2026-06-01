# eUsage

eUsage is an open source fork of OpenUsage.

This fork is not the official OpenUsage project. Original source code is MIT licensed; the OpenUsage name and logo are not reused.

## Product Direction

eUsage is open source and self-deployed per team.

v1 implementation order:

1. Web/backend first: `web/`, TanStack Start, Convex schema, ingest API, very plain Admin, very plain TV.
2. Windows shell/tray second: make the desktop app run cleanly on Windows and appear from the taskbar corner/overflow.
3. Cross-OS desktop functionality third: team connection, new UI/UX, provider reads, and usage upload on both macOS and Windows.
4. UI polish after the data loop, provider logic, calculations, and cross-OS behavior work.

Derived metric calculations live in shared pure TypeScript functions under `web/src/lib/metrics`. Convex returns source rows; Admin and TV reuse the same calculation functions.
Metric functions get unit tests from day one for Cursor pool, quota averages, date-range comparison, and oldest-update formatting.

MVP done means Cursor, Codex, Claude, and JetBrains AI Assistant work locally on both macOS and Windows, with real data visible in Admin and TV. After Cursor thin slice, provider order is Codex, Claude, then JetBrains. Deploy to Vercel/Convex after all four providers work locally. Ready for teammates requires real Vercel + Convex deployment with one macOS desktop and one Windows desktop connected.

See `docs/v1-mvp-build-order.md`.

Official v1 path:

- Each team deploys its own Vercel project.
- Each team uses its own Convex Cloud project.
- Each team uses its own Clerk app for admin login.
- One deployment contains one team in v1.
- eUsage does not run a central shared SaaS in v1.
- First admin setup uses a deploy-time `SETUP_TOKEN`.
- After first admin setup is complete, `/setup` no longer accepts `SETUP_TOKEN` and only links to the dashboard.
- Clerk handles admin auth only. Developer desktop sync uses eUsage developer tokens.
- v1 has one owner per team deployment.
- Owner recovery is manual in v1; the setup token cannot reset or replace the owner.
- Admins should get a polished setup and invite flow.
- Developers connect with admin-created raw tokens in v1.
- Each developer gets their own managed token with name and metadata.
- Developer token hashes and fingerprints live in a separate `developerTokens` table linked to the developer.
- v1 keeps one current developer token per developer; token rotation replaces the current token record.
- Developer status is active or inactive in v1. Revoking a token makes the developer inactive.
- Developer identity during sync comes from the token record, not desktop input.
- The same developer token can be used on multiple devices; each desktop installation has its own device identity.
- Device ID is a random UUID generated on first desktop run and stored locally.
- Device data is operational status only in v1; usage dashboards show developer-level totals, not per-device charts.
- Device status is `connected`, `stale`, `disconnected`, or `archived`.
- Devices become stale after 72 hours without a successful device check-in.
- The desktop app sends a lightweight device check-in on app start and existing refresh ticks so stale status does not depend on usage changes.
- Admins can archive stale or duplicate device status records without deleting usage history.
- Developer setup uses one copy/paste connection string.
- Connection string contains only team URL and developer token: `eusage://connect?url=...&token=...`.
- Desktop uses minimal versioned TanStack Start server routes in `web/`, deployed as Vercel Functions, for team config, device check-in, usage batch upload, and device disconnect.
- Desktop API routes live under `/api/v1`.
- Every usage batch includes `uploadSchemaVersion`, separate from `/api/v1`, `summaryVersion`, and `extractorVersion`.
- `GET /api/v1/team-config` is public and returns only safe metadata: team name, app version, API version, and endpoint paths.
- `POST /api/v1/usage/batch` returns a small sync result: accepted count, rejected provider IDs, and server time.
- Usage batch accepts valid provider payloads even when other provider payloads in the same batch are rejected.
- If a provider payload has invalid or missing source facts, that provider is rejected only; other providers in the batch can still be accepted.
- Rejected provider payload errors are stored in Convex `syncErrors` with `expiresAt`; a Convex cron deletes expired rows.
- Rejected provider payload errors are not shown in desktop/provider UI in v1.
- Admin dashboard and TV use Clerk-authenticated Convex functions directly instead of extra Vercel API wrappers.
- Team sync runs after successful local provider probe results, using the existing auto-update/manual refresh flow.
- Successful provider results are batched with a 30 second named debounce window before upload.
- Retryable team upload failures keep the pending batch in memory and retry on the next refresh while the app stays open.
- On quit, the desktop app tries to flush any pending team-sync batch with a short timeout.
- Team sync failures show in a small team status area, not as provider probe failures.
- Team sync uploads full successful plugin payloads plus desktop-extracted source facts so dashboards can use all collected data.
- Full payload uploads must be redacted first: plugins should not return secrets, and desktop runs a generic secret-field scrubber before upload.
- Stored usage includes full payload plus normalized source facts. Usage snapshots and metric samples store semver string `summaryVersion` and per-provider `extractorVersion`. Raw payloads are retained for 90 days; normalized source facts and metric samples are retained for all-time reporting.
- Desktop/provider code extracts normalized source facts before upload. The web/backend validates and stores those facts; it does not own normal provider extraction in v1.
- Each v1 provider plugin must have tests for normalized source facts and upload redaction shape before that provider counts as done.
- DB stores source values needed for calculations. Admin/TV/web code calculates derived totals, averages, percentages, projections, comparisons, and chart aggregates from those source values instead of storing duplicate calculated values.
- v1 admin UI does not expose a raw payload viewer. Raw payloads stay in Convex for backend debugging/reprocessing only.
- Convex uses normalized v1 tables for team, admins, developers, developer tokens, devices, providers, usage snapshots, raw payloads, daily metric samples, audit events, sync errors, dashboard settings, and TV settings. See `docs/convex-data-model-v1.md`.
- v1 keeps all normalized usage history and supports all-time developer/provider comparisons.
- v1 has no hard-delete usage UI. Admins archive or inactivate records; full data reset is manual in Convex.
- Usage snapshots are upserted by developer, device, provider, and usage period/data identity. Same data overwrites latest snapshot.
- Usage snapshots are the dashboard source of truth. v1 does not store every usage upload as immutable history.
- Daily `metricSamples` store small source metric history for over-time charts. Admin/TV calculate burn, pace, projection, and comparisons from those samples.
- For overlapping snapshots from multiple devices, v1 dashboard totals use the latest device snapshot. Provider-specific merge rules are future work.
- If provider period is missing, usage snapshots fall back to one day bucket per developer and provider.
- Admin Overview is a dense analytics dashboard; TV mode is separate fullscreen slides.
- Dashboard customization includes developer visibility, provider checkboxes, date ranges, compare modes, TV slide order, slide duration, and theme/display mode.
- Chart catalog includes developer over-time comparison, all-developer team totals, provider/platform breakdowns, per-provider trends, usage-limit pressure, and Cursor credit-pool usage.
- Cursor credit-pool TV uses a reservoir/pool visual, not a plain chart.
- Cursor pool calculation uses provider-reported pooled fields when present; otherwise it falls back to summed per-developer on-demand limits and usage.
- Cursor fallback used value prefers explicit `individualUsed`; otherwise it uses `individualLimit - individualRemaining`.
- Developers missing Cursor on-demand limit data are excluded from fallback pool totals and counted as missing budget data.
- Cursor pool TV shows missing budget data as a small note such as `4/5 developers reporting budget data`.
- v1 has no manual Cursor budget override UI; Cursor pool/budget charts use provider data only.
- Admin web navigation is `Overview`, `Developers`, `Providers`, `TV`, and `Settings`; deeper device/token/system details live inside those pages.
- Admin Overview is a fixed all-up page with everything important; focused pages show deeper data by type.
- Admin Overview includes KPI strip, team usage over time, developer leaderboard, provider breakdown, Cursor pool, sync health, and compact detail tables.
- Admin KPI strip defaults to team spend/usage, active developers, top provider, sync health, and Cursor pool remaining.
- Admin Overview compact tables are Top Developers, Provider Status, and Recent Syncs.
- Developer leaderboard defaults to total spend/usage across visible providers; provider filters can narrow it to Cursor or another provider.
- Admin dashboard widgets are not draggable/reorderable in v1.
- Admin dashboard config and TV/display config are separate.
- TV default slides are Team Overview, Developer Leaderboard, Provider Breakdown, Cursor Pool, and Sync Health.
- TV mode defaults to 10 seconds per slide, with admin-managed slide order and per-slide duration.
- TV settings use a `dnd-kit` sortable list with enable toggles and per-slide duration inputs.
- TV mode supports automatic rotation plus pause/resume, previous/next, and exit fullscreen controls.
- Every TV slide shows `Oldest update: ...` for the oldest visible data used by that slide. Format omits leading zero units: `9d 3h 4m 12s ago`, `3h 4m 12s ago`, `4m 12s ago`, or `12s ago`. Freshness colors appear only on Sync Health.
- TV/display mode defaults to last 7 days and supports last 30, last 90, all time, and custom date ranges.
- TV and admin date comparisons use the previous equal-length range for last 7, last 30, last 90, and custom ranges; all-time has no percent-delta comparison.
- TV Team Overview leads with team usage/spend and percent change, then also shows Cursor pool, top provider, active developers, and sync health.
- TV Team Overview headline uses tokens burned plus estimated API cost, with a compact available-metrics table for tokens, cost, budget/spend, quota pressure, credits, requests, Cursor pool, and sync health. Rows stay stable; missing values show `No data yet`.
- Quota pressure supports per-developer-per-provider values, per-developer averages, per-provider team averages, team average, worst active pressure, and high-pressure counts.
- Quota pressure averages are simple averages of visible reported percent values only. Visible means current date range, selected developers, selected providers, hidden/inactive rules, and dashboard filters. Missing reports are excluded and coverage is shown, for example `12/15 reporting`.
- Per-developer quota averages also exclude missing provider reports and show provider coverage, for example `2/3 providers`.
- Per-provider team quota averages also exclude missing developer reports and show developer coverage, for example `2/3 developers`.
- Worst active pressure shows both worst single developer-provider value and worst per-developer average, for example `Claude 96% - Alex; Alex avg 82%`.
- Quota pressure thresholds are warning at `>=80%` and critical at `>=95%`.
- The TV table stays readable without hover; interactive tooltips can explain metric source, providers included, unit, and confidence.
- Admin Overview also includes compact metric tables with the same tooltip explanations.
- Admin dashboard uses the same date range choices for reviewing data.
- Admin dashboard can see all developers; admin filters can focus on selected developers.
- TV mode has separate developer visibility settings.
- Inactive developers remain reviewable in admin, disappear from TV by default, and can be re-enabled with a new token.
- If an admin creates a duplicate developer, v1 supports manually inactivating the wrong developer and issuing/rotating the correct developer token. No developer merge UI in v1.
- New providers are visible by default. Global provider disable hides from all views but still collects and stores data.
- Revoking a developer token stops all devices for that developer. Desktop also supports local disconnect so another developer can connect the same machine.
- Local disconnect notifies the backend when online, but still succeeds offline.
- After local disconnect, desktop never reconnects automatically. A connection string must be pasted again.
- Token rotation revokes the old developer token immediately.
- Raw developer tokens are shown once on create/rotate. Later UI shows hash-backed fingerprint and metadata only.
- Developer token hashes use SHA-256 of long random raw tokens.
- Desktop stores the raw developer token in OS credential storage: macOS Keychain or Windows Credential Manager.
- Desktop stores non-secret team URL, team name, and token fingerprint in normal app config.
- Desktop sends the developer token to backend HTTP endpoints with an `Authorization: Bearer ...` header.
- If the backend rejects the developer token as invalid, revoked, or inactive, desktop stops team sync, removes the stored raw token, and requires a new connection string.
- TV mode can hide globally visible providers separately from the admin dashboard.
- Dashboard charts use Chart.js in React.
- Dashboard and TV/fullscreen mode require admin login in v1.
- Developers should get a simple macOS/Windows desktop connection flow.
- Windows desktop UI uses a taskbar tray popup window near the tray area.
- This eUsage/openusage codebase is the v1 product base; CodexBar is reference only, not the implementation base.
- Windows v1 provider guarantee: Codex, Cursor, Claude, and JetBrains AI Assistant.
- Cursor Windows v1 requires the Cursor app installed and signed in; eUsage reads supported Cursor local storage paths.
- Provider credentials use a cross-platform desktop API: macOS Keychain on macOS and Windows credential storage on Windows.
- Provider plugins own their own macOS and Windows data path candidates.
- Windows builds bundle SQLite for provider database reads, so users do not install SQLite manually.
- Windows v1 targets x64 first; Windows ARM64 is future work.
- Windows v1 ships an unsigned x64 installer first; code signing is future work.
- Windows first run explains that eUsage lives in the taskbar corner or overflow area and can be pinned by the user.
- Team connection can succeed even before local providers are configured; provider cards show setup/error status separately. Cursor can show `Setup needed`, `Signed out`, or `Unreadable` with short fix text.
- The desktop app has a dedicated Team page for connect/disconnect, sync status, device status, and provider setup summary.
- Windows work starts with the desktop shell and tray popup before provider-specific Windows data collection.
- Windows tray popup reuses the hidden `main` Tauri window; macOS keeps the NSPanel popup.
- Provider "supported on Windows" means readable when the provider app or CLI is installed and signed in with supported local storage.

See [Decision 0001](docs/architecture-decision-0001-self-deployed-vercel-convex.md).

## Local Development

Local dev uses two commands:

```bash
bun dev:web
bun dev:desktop
```

`bun dev:web` starts TanStack Start and Convex dev.
`bun dev:desktop` starts the Tauri desktop app.
Web tests use a separate command:

```bash
bun test:web
```

Local desktop connection uses the same connection string shape with localhost:

```text
eusage://connect?url=http://localhost:3000&token=eusage_dev_...
```

See `docs/local-development.md`.

## Admin Setup Flow

Day one setup for a team admin:

1. Fork this repo.
2. Create a Convex Cloud project.
3. Create a Clerk app.
4. Create a Vercel project from the fork.
5. Generate a setup token:

```bash
openssl rand -base64 32
```

6. Add Vercel environment variables:

```text
CONVEX_DEPLOY_KEY=...
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_HTTP_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
SETUP_TOKEN=...
```

7. Deploy the Vercel project.
8. Open `/setup` on the deployed app.
9. Sign in with Clerk.
10. Enter `SETUP_TOKEN`.
11. Create the team. This Clerk user becomes the deployment owner.
12. Create a developer token.
13. Copy the generated connection string and send it to the developer.

The connection string will look like:

```text
eusage://connect?url=https://your-eusage.vercel.app&token=eusage_dev_...
```

It contains only the team URL and developer token.
The desktop app discovers team name and endpoint paths from `/api/v1/team-config`.

## Developer Setup Flow

Day one setup for a developer:

1. Install the eUsage desktop app on macOS or Windows.
2. Open the menu bar or taskbar tray app.
3. Choose connect team.
4. Paste the connection string from the admin.
5. Confirm the team name shown by the app.
6. eUsage starts syncing local usage to the team deployment.

The desktop app uses the app URL from the connection string to discover non-secret team config such as the collector endpoint. The developer does not manually enter Convex URLs.

## Development

See [Local Development Setup](docs/local-development.md) for macOS and Windows setup.

```bash
bun install
bun run test
bun run collector:test
bun tauri dev
```

## License

MIT. See [LICENSE](LICENSE).
