# v1 Build Order

## Goal

Prove the full eUsage loop with real data first, then finish the provider/platform matrix before calling v1 MVP done.

## Milestone 1: Web/Backend

The first milestone creates the web/backend target that desktop clients will talk to.

1. Create `web/`.
2. Add TanStack Start.
3. Add Convex dev setup.
4. Add Convex schema.
   - Core tables from `docs/convex-data-model-v1.md`.
   - Token lookup.
   - Usage snapshot upsert.
   - Metric sample upsert.
   - Raw payload retention fields.
5. Add desktop ingest API.
   - `GET /api/v1/team-config`
   - `POST /api/v1/device/check-in`
   - `POST /api/v1/usage/batch`
   - `POST /api/v1/device/disconnect`
   - `POST /api/v1/provider-account/update`
6. Add minimal Admin.
   - Clerk login.
   - Setup owner.
   - Create developer token.
   - Developer row.
   - Very plain UI only.
7. Add minimal TV.
   - Team Overview slide shell.
   - Update freshness label.
   - Very plain UI only.

## Milestone 2: Windows Shell

Build Windows shell/tray before provider-specific Windows data collection.

1. Make the Tauri desktop shell compile and run on Windows.
2. Add the Windows tray popup window.
3. Verify Windows install/dev run behavior.
4. Confirm eUsage appears in taskbar corner or overflow.

## Milestone 3: Cross-OS Functionality

Add the new desktop UI/UX and team sync functionality on both macOS and Windows.

1. Desktop team connection.
   - Paste connection string.
   - Store token in Keychain or Windows Credential Manager.
   - Store team URL and fingerprint in config.
   - Show sync status.
2. Cursor first.
   - Extract Cursor source facts on desktop.
   - Send Cursor payload and source facts end-to-end.
   - Redact before upload.
   - Write raw payload, usage snapshot, and metric samples.
   - Prove plan usage, on-demand usage, API percent, and pool/budget fields.
3. Admin proof.
   - See developer row.
   - See Cursor budget fields.
   - See token status.
   - See device sync status.
4. TV proof.
   - Cursor on-demand pool/budget remaining from synced data.
5. Expand providers and charts.
   - Codex.
   - Claude.
   - JetBrains AI Assistant.
   - Dashboard tables.
   - TV slide set.
6. Polish UI after logic is working.
   - Better layout.
   - Better charts.
   - Better TV visuals.
   - Admin/TV UX pass.

## MVP Done

MVP is done only when all required v1 providers work on both macOS and Windows:

- Cursor.
- Codex.
- Claude.
- JetBrains AI Assistant.

Done means:

- Developer can connect team with connection string.
- Provider can read real local data when installed and signed in.
- Desktop uploads usage to the team app.
- Admin shows provider/developer data.
- TV shows real synced data.
- Windows tray and macOS menu bar flows both work.

Each provider/platform pair must pass the manual checklist in `docs/local-development.md`.

## Ready For Teammates

Ready for teammates requires:

- Real Vercel deployment.
- Real Convex Cloud project.
- Clerk admin login working.
- One macOS desktop connected.
- One Windows desktop connected.
- Real synced data visible in Admin.
- Real synced data visible in TV.

Deployment timing:

- Finish all four required providers locally on macOS and Windows first.
- Then deploy to real Vercel and Convex.
- Then connect one macOS desktop and one Windows desktop to the deployed app.

Provider order after Cursor thin slice:

1. Codex.
2. Claude.
3. JetBrains AI Assistant.

## Rule

Do not build the full dashboard on fake data first.
Every slice should connect desktop, backend, Convex, admin, and TV.
Do not polish UI before the data loop, provider logic, calculations, and cross-OS behavior work.
