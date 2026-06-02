# eUsage v1 Edge Cases and Link Map

This document supports the v1 PRD. It lists important edge cases and shows how the parts connect.

## System Link Map

Admin setup creates the team and owner.
Developer management creates developer records and tokens.
Desktop connection uses the connection string to save team URL and token.
Provider probes produce local usage data.
Desktop source fact extraction converts provider data into upload contract data.
Team sync uploads batches to the web app.
The web app validates auth and payload shape.
Convex stores source facts, raw redacted payloads, and metric samples.
Metric functions calculate Admin and TV values.
Visibility and date filters decide what each view shows.
TV slide settings decide slide order, duration, and display range.

Simple flow:

```text
Admin -> Setup -> Team -> Developer Token -> Connection String
Developer -> Desktop -> Provider Probe -> Source Facts -> Usage Batch
Usage Batch -> Web API -> Convex Source Rows -> Metric Engine
Metric Engine -> Admin Overview
Metric Engine -> TV Slides
```

## Setup and Deployment Edge Cases

- Setup token missing in environment: setup page must fail clearly and tell admin to configure deployment env.
- Setup token wrong: setup page rejects and does not create owner.
- Setup already complete: setup page does not accept token again and links to dashboard.
- Clerk sign-in works but setup token wrong: no owner row is created.
- Clerk sign-in fails: setup cannot proceed.
- Convex env missing or wrong: setup/dashboard fail loudly; no silent fake state.
- Vercel route deployed but Convex unreachable: Admin shows deployment/backend error.
- Team name empty: setup cannot complete.
- Duplicate setup submissions: only first valid owner claim succeeds.
- Owner loses Clerk access: no in-app reset; manual recovery docs required.
- Team wants multiple admins: out of scope v1.
- Team wants multiple teams in one app: out of scope v1.
- Team forks and self-hosts differently: allowed, but official docs optimize for Vercel plus Convex Cloud plus Clerk.

## Developer Token Edge Cases

- Raw token copy lost: admin rotates token; old token revokes immediately.
- Token leaked: admin rotates or revokes token.
- Token hash collision: practically ignored because tokens are long random values; hash lookup should still enforce active status.
- Short or human-entered token: not allowed; app generates tokens.
- Token shown after create page reload: not possible; rotate needed.
- Admin edits developer name after token creation: future uploads still attach to same developer ID.
- Developer sends fake name in payload: backend ignores it.
- Token revoked while desktop is open: next authenticated request returns invalid/revoked/inactive; desktop deletes local token and stops team sync.
- Developer inactive but still has local token: backend rejects; desktop disconnects team sync.
- Admin re-enables inactive developer: new raw token shown once; old token remains unusable.
- Duplicate developer created: admin inactivates wrong developer and rotates correct developer token; no merge UI.
- Same token on two laptops: allowed; usage groups under one developer.

## Desktop Connection Edge Cases

- Connection string wrong scheme: reject before saving token.
- Connection string missing URL: reject before saving token.
- Connection string missing token: reject before saving token.
- Connection string has Convex URL instead of team app URL: team config request fails.
- Team config URL returns no app metadata: desktop rejects connection or shows clear error.
- Team config returns unsafe data: desktop ignores anything outside safe metadata contract.
- Team config endpoint public: must not expose setup state, admin emails, tokens, Clerk secrets, Convex URLs, or provider credentials.
- Token is pasted into settings but team config fails: do not store token permanently until connection is confirmed.
- User disconnects while offline: remove local credentials anyway; backend status may become stale later.
- Disconnect backend notify fails: local disconnect still succeeds.
- User reconnects after disconnect: requires new connection string or same valid connection string pasted again.
- Backend rejects token during check-in: desktop deletes raw token and marks team connection invalid.
- Local app data cleared: new device ID is generated; admin may see duplicate device status.
- OS credential store unavailable: desktop should fail loudly and not store raw token in plain config.

## Device Status Edge Cases

- Device never uploads usage but checks in: admin sees connected device, no usage yet.
- Device has no check-in for 72 hours: status becomes stale.
- Network outage lasts over 72 hours: device may appear stale; acceptable v1 behavior.
- Desktop sends disconnect event: device becomes disconnected.
- Admin archives device: hidden from normal device lists, usage remains.
- Reinstall creates new device ID: admin can archive old device.
- Multiple devices upload same developer/provider/period: latest device snapshot wins for dashboard totals.
- One device stale, another fresh: fresh latest snapshot wins.
- Device status is not a usage dimension: no per-device charts in v1.

## Provider Probe Edge Cases

- Team connection works but providers are missing: Team page says connected; provider cards show setup states.
- Provider installed but signed out: provider card says signed out where detectable.
- Provider storage file exists but unreadable: provider card says unreadable.
- Provider returns no supported usage fields: card shows no data or provider-specific setup message.
- Provider API changes shape: extractor test should fail; runtime provider error should not crash app.
- Provider probe fails after old success: local card can keep previous successful data with error status; upload should not send failed probe as fresh usage.
- Disabled local provider: not probed or not shown locally based on current app settings.
- Globally hidden provider in team settings: still collected and stored, hidden only from Admin/TV views.
- TV-hidden provider: still visible in Admin if globally enabled.
- Provider path differs on Windows: plugin owns Windows candidates and must be tested on real Windows.
- Provider credentials are in OS store rather than file: plugin uses cross-platform credentials API when needed.
- Windows SQLite missing from system: bundled SQLite must be used.

## Required Provider Notes

- Cursor: source values include plan usage, API percent, on-demand usage, individual limit, pooled limit, remaining, used, reset dates, and plan name when available.
- Cursor: Windows requires Cursor desktop installed and signed in; first target storage is the Cursor global storage database under roaming app data.
- Cursor: pooled provider fields win; if missing, fallback sums per-developer on-demand limits and usage.
- Cursor: missing on-demand limits are excluded and counted, not treated as zero.
- Codex: source values include rate-limit windows, reset times, plan type, optional credits, and optional code review limit.
- Codex: Windows support must check where Codex stores auth on Windows, including keyring/credential manager or file modes.
- Claude: source values include five-hour, seven-day, optional Opus/design windows, extra usage, credits, and monthly limit.
- Claude: Windows support must check credential file or credential storage behavior for Claude Code.
- JetBrains AI Assistant: source values come from IDE quota cache files; path candidates differ by OS.
- JetBrains AI Assistant: multiple IDEs may exist; choose the valid quota file with the latest quota window.

## Upload Batch Edge Cases

- No team connection: do not upload.
- Provider probe succeeded: enqueue provider result for batch.
- Same provider updates during debounce: replace older pending provider result.
- No provider changes for 30 seconds: send whole batch.
- Manual refresh and auto refresh both use same path.
- Upload network failure: keep batch in memory and retry on next refresh.
- App quits with pending batch: try bounded flush; do not block quit forever.
- App quits before retry succeeds: no disk queue; next launch rebuilds from provider probes.
- Backend accepts some providers and rejects others: accepted providers are done; rejected providers are listed and logged.
- Provider missing source facts: reject that provider only; do not store raw-only provider rows.
- Upload schema version unsupported: reject batch or provider with clear compatibility error.
- Summary version missing: reject provider.
- Extractor version missing for provider: reject provider.
- Redaction marker missing where secret-shaped fields exist: reject or log loudly based on validator rule.
- Payload too large: reject with clear error; do not crash API route.

## Backend and Convex Edge Cases

- Bearer header missing: authenticated endpoints return auth error.
- Bearer token malformed: return auth error.
- Token hash not found: return auth error.
- Token revoked/inactive: return auth error that desktop treats as disconnect.
- Device check-in with valid token but no device row: create or update device for developer.
- Device disconnect with valid token: mark device disconnected.
- Usage snapshot same key arrives twice: overwrite latest row.
- Metric sample same key arrives twice: overwrite latest sample.
- Raw payload expiry job runs: delete raw payload and clear snapshot raw reference.
- Sync error expiry job runs: delete expired sync errors.
- Audit events stay small: setup, token changes, device archive, settings changes; no full payload logs.
- Admin query with no team row: show setup needed or deployment broken state.
- Admin query with empty usage: show no-data states, not broken charts.

## Data and Calculation Edge Cases

- Store source facts only when provider-reported, extractor-estimated, or needed after raw payload expiry.
- Do not store chart totals that can always be recalculated from source rows.
- Missing metric field: exclude from average and show coverage.
- Quota pressure average: simple average of visible reported percent values only.
- Per-developer average: visible providers with reported values only.
- Per-provider average: visible developers with reported values only.
- Team average: visible developer-provider reports only.
- Worst active pressure: show worst single developer-provider value and worst per-developer average.
- Threshold 80 percent: warning.
- Threshold 95 percent: critical.
- Last 7, 30, 90, custom: compare to immediately previous equal-length range.
- All time: no percent delta.
- Custom range one day: previous one day.
- Custom range invalid end before start: reject in UI.
- Time zone: use consistent date bucketing; avoid mixing local UI labels with server period keys.
- Provider period missing: use day bucket fallback.
- Provider returns historical machine data on first sync: preserve provider period when present so history lands on correct timeline.

## Cursor Pool Edge Cases

- Pooled fields present: use pooled total, used, remaining; do not sum across developers.
- Pooled fields present on multiple developer rows: choose provider-reported pooled model, not sum.
- Pooled fields missing: fallback to summed per-developer on-demand limit and used.
- Developer has limit and explicit used: use explicit used.
- Developer has limit and remaining only: used equals limit minus remaining.
- Developer has no limit: exclude from fallback and count missing.
- Developer has invalid negative values: reject or exclude depending on extractor validation.
- All developers missing limit: show no usable pool data, with missing-data count.
- Pool remaining negative: show over limit state, not broken chart.
- Missing data note appears as small note, not alarm banner.
- No manual budget overrides in v1.

## Dashboard and TV Edge Cases

- New developer syncs: visible by default in Admin and TV unless hidden by settings.
- Inactive developer: hidden from TV by default, reviewable in Admin.
- Provider globally disabled: hidden everywhere, still stored.
- Provider TV-disabled only: hidden on TV, visible in Admin.
- TV has no data for slide: show no-data state and `Updates: No data yet`.
- Slide has mixed data timestamps: oldest and newest visible timestamps are used.
- Freshness age under one minute: show seconds only.
- Freshness age over one day: show days, hours, minutes, seconds.
- Freshness colors only on Sync Health; other slides show plain freshness text.
- TV controls hidden until hover/keyboard: should remain accessible.
- Slide duration too low: enforce sane minimum.
- Slide duration empty or invalid: reject or reset to default.
- Admin overview tooltip not available on TV: TV labels and source/status text must stand alone.
- Chart container small: text must not overlap or resize layout badly.

## Windows Edge Cases

- App builds but tray icon hidden in overflow: first-run guidance explains pinning.
- Taskbar on left/top/right: popup positioning should use actual tray/taskbar area where possible.
- Multiple monitors: popup should appear near tray on active taskbar/display where possible.
- Display scaling high DPI: popup should be positioned and sized correctly.
- Windows SmartScreen warning: docs explain unsigned installer v1.
- Credential Manager write fails: team connect fails loudly.
- SQLite binary missing from package: provider database reads fail with actionable setup/deployment error.
- Provider path uses backslashes or environment variables: plugin path logic handles Windows paths.
- User runs through WSL: docs say not supported for tray testing; must run native Windows app.

## Security and Privacy Edge Cases

- Developer token in URL only exists in local connection string handoff; backend requests use bearer auth.
- Backend logs must not log bearer token.
- Team config must not leak secrets.
- Raw payloads must be redacted before upload.
- Sync errors must not include raw payloads or secrets.
- Redaction should avoid over-redacting every ordinary map key named like a harmless value, but secret-looking names win.
- If a plugin accidentally returns a secret, generic scrubber should redact it before upload.
- If backend detects obvious unredacted secrets, it should reject or log loudly.
- Raw payloads expire after 90 days.
- Normalized source facts remain for all-time reporting.

## Release and Readiness Edge Cases

- Cursor end-to-end works: not MVP done.
- All four providers must work on macOS and Windows before v1 MVP done.
- Local proof is not ready for teammates.
- Ready for teammates requires deployed Vercel app, Convex Cloud project, Clerk login, one macOS desktop, one Windows desktop, and real data in Admin and TV.
- Provider tests passing is not enough; each provider/platform pair needs manual checklist.
- Deployment should happen after local four-provider matrix works.
- UI polish should wait until real data loop and cross-OS provider behavior work.

## Implementation Dependency Order

1. Web/backend scaffold.
2. Convex schema and local dev setup.
3. Setup owner flow with Clerk and setup token.
4. Developer/token/device tables and admin CRUD.
5. Desktop API routes and upload contract.
6. Shared metric functions and tests.
7. Minimal Admin and TV no-data states.
8. Windows shell and tray popup.
9. Desktop Team page and connection string flow.
10. Desktop credential storage for macOS and Windows.
11. Batch/debounce/retry/flush team sync.
12. Cursor source fact extractor and upload.
13. Cursor Admin and TV proof.
14. Codex source fact extractor and upload.
15. Claude source fact extractor and upload.
16. JetBrains source fact extractor and upload.
17. Chart catalog and TV slide set.
18. Real macOS and Windows checklist.
19. Deploy to real Vercel, Convex, and Clerk.
20. Connect one macOS and one Windows desktop to deployed app.
