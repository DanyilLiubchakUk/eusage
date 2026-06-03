# Decision 0076: Admin navigation is simple with deeper pages

## Status

Accepted

## Context

The admin web app needs more than a single dashboard, but a full enterprise console would be too much for v1.

Admins need usage review, developer/token management, provider visibility, TV setup, and team settings.

Device status and token details matter, but they do not need top-level navigation items.

Sync error logs are stored in Convex with expiry and do not need a v1 UI.

## Decision

Use top-level admin navigation:

- `Overview`
- `Developers`
- `Providers`
- `TV`
- `Settings`

The same admin navigation is visible on every admin page.

Every top-level admin navigation item must route to a real focused page. Promised admin routes must not show `Not Found`.

Page ownership:

- `Overview`: all-up page with the most important usage charts, comparisons, date filters, pool status, provider breakdown, and sync health.
- `Developers`: developer list, active/inactive state, token create/rotate/revoke, device status nested under developer.
- `Providers`: global provider visibility, provider readiness/status, reporting developers, last synced data, setup/debug hints, exact percent tiles for that provider, and simple provider-only charts.
- `TV`: TV slide config, TV visibility, fullscreen launch.
- `Settings`: team metadata, setup status, owner/recovery info, deployment/debug info, dashboard defaults, and safe shortcuts/status for focused workflows.

Settings owns:

- Team name and team metadata.
- Setup status and sealed setup state.
- Current owner identity and manual owner-recovery guidance.
- Deployment/debug info, including app URL, app version, API version, endpoint paths, and safe environment health.
- Dashboard defaults such as default date range, comparison mode, theme/display mode, and review defaults.
- TV display-link status and quick actions to copy, open, rotate, or revoke the display link.
- Links/status cards for Developers, Providers, and TV when those pages own the deeper controls.

Settings does not own:

- Developer create, rotate, revoke, re-enable, or device archive actions. Those stay on `Developers`.
- Global provider visibility and provider readiness management. Those stay on `Providers`.
- TV slide order, enabled slides, per-slide duration, TV visibility, and inline TV preview. Those stay on `TV`.
- Raw payload viewing, hard-delete usage, owner transfer, or setup-token reuse.

Safe environment health shows status only, never secret values.

It should cover:

- Clerk configured or missing.
- Convex configured or missing.
- Setup sealed or setup needed.
- App URL detected.
- API routes reachable.

Health rows must avoid flashing false errors while auth or config is still loading.

No top-level `Devices`, `Logs`, or `Audit` page in v1.

No raw payload viewer in v1 admin UI.
Raw payloads remain available in Convex for backend debugging and short-term reprocessing only.

## Consequences

Admin UI stays small enough to build well.

Admins get one all-up page plus focused pages for deeper work.

Admins can move between Overview, Developers, Providers, TV, and Settings without copying URLs or returning to setup.

Provider management stays lighter than Overview. It can show simple provider-only charts, but should not duplicate the full all-up analytics dashboard.

Provider-only charts in v1 include simple trends when samples exist and exact percent tiles for the selected provider. They do not include raw payload viewing, a full dashboard builder, or deep cross-provider analytics.

Developer/token/device management stays together.

Logs remain available in Convex for debugging without adding another UI surface.

Future versions can add top-level logs/audit/devices if real usage proves need.

## Alternatives Considered

- One page with all sections: fastest, but becomes messy quickly.
- Full admin console with devices/logs/audit top-level pages: powerful, but too much for v1.
