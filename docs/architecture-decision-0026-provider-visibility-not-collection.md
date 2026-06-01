# Decision 0026: Provider disable hides from views, not collection

## Status

Accepted

## Context

Admins can show or hide providers/platforms such as Cursor, Codex, Claude, and others.

When an admin disables a provider globally, they want that provider hidden from all developers' data on admin dashboard and TV mode. They do not want to lose historical data or stop future data from being available if the provider is enabled again.

## Decision

New providers are visible by default.

Global provider disable means hidden from all views:

- Admin dashboard.
- TV/display mode.
- Charts and comparisons.

Provider data is still collected, synced, and stored while hidden.

If the admin enables the provider again, existing historical and newly synced data becomes visible again.

## Consequences

Provider visibility never causes data loss.

The backend must keep storing hidden-provider data.

Dashboard queries or render logic must apply visibility filters without deleting or suppressing ingestion.

## Alternatives Considered

- Disable collection when globally disabled: saves storage, but loses data and makes re-enable incomplete.
- TV-only provider visibility: useful as separate TV config, but not the meaning of global provider disable.
