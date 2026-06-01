# Decision 0068: Use normalized Convex schema for v1

## Status

Accepted

## Context

The dashboard needs filtering by developer, provider, device health, date range, admin view settings, and TV settings.

A very small schema would be faster to build, but token management, provider visibility, raw payload storage, and future dashboard views would become harder to reason about.

A fully enterprise schema would be too much for v1.

## Decision

Use normalized Convex tables for v1:

- `teams`
- `admins`
- `developers`
- `developerTokens`
- `devices`
- `providers`
- `usageSnapshots`
- `rawPayloads`
- `metricSamples`
- `auditEvents`
- `syncErrors`
- `dashboardSettings`
- `tvSettings`

Detailed field shape lives in `docs/convex-data-model-v1.md`.

`developerTokens` stores token hash, fingerprint, label, status, timestamps, and developer link.

v1 keeps one current developer token per developer. Token rotation replaces the current token record instead of keeping multiple active tokens.

`usageSnapshots` is the dashboard source of truth. It stores desktop-extracted source/query fields and references `rawPayloads`.

`rawPayloads` stores the full redacted plugin payload for 90 days.

`metricSamples` stores small daily source metric history for charts.

`auditEvents` stores small operational events such as setup completed, developer created, token rotated, token revoked, device archived, and settings changed. It should not duplicate full usage payloads or preserve every usage upload.

`syncErrors` stores short-lived rejected provider payload errors with `expiresAt`.

## Consequences

Dashboard queries stay clear.

Admin token/device/provider management has clean ownership boundaries.

Raw payload storage is separated from summary query fields.

Daily chart history is available without storing every raw upload.

The schema is larger than the simplest option, but still small enough for self-deployed teams.

Decision 0058 is superseded because token fields move out of the developer record.

## Alternatives Considered

- Simple core tables only: faster, but token/provider/raw payload boundaries get muddy.
- One big table: fastest initial write path, but bad for dashboard filtering and admin management.
