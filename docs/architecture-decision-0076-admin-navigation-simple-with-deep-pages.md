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

Page ownership:

- `Overview`: all-up page with the most important usage charts, comparisons, date filters, pool status, provider breakdown, and sync health.
- `Developers`: developer list, active/inactive state, token create/rotate/revoke, device status nested under developer.
- `Providers`: global provider visibility and provider-level status.
- `TV`: TV slide config, TV visibility, fullscreen launch.
- `Settings`: team metadata, setup status, deployment/debug info, dashboard defaults.

No top-level `Devices`, `Logs`, or `Audit` page in v1.

No raw payload viewer in v1 admin UI.
Raw payloads remain available in Convex for backend debugging and short-term reprocessing only.

## Consequences

Admin UI stays small enough to build well.

Admins get one all-up page plus focused pages for deeper work.

Developer/token/device management stays together.

Logs remain available in Convex for debugging without adding another UI surface.

Future versions can add top-level logs/audit/devices if real usage proves need.

## Alternatives Considered

- One page with all sections: fastest, but becomes messy quickly.
- Full admin console with devices/logs/audit top-level pages: powerful, but too much for v1.
