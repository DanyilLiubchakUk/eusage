# Decision 0083: No manual Cursor budget overrides in v1

## Status

Accepted

## Context

Cursor pool and on-demand budget charts can use provider-reported spend-limit data.

Manual admin overrides could fill missing data, but they create another source of truth and can drift from Cursor.

v1 should keep admin setup simple.

## Decision

v1 has no manual Cursor budget override UI.

Cursor budget charts use provider data only.

If Cursor on-demand limit data is missing for a developer, eUsage excludes that developer from fallback pool totals and shows missing budget data count.

## Consequences

Budget charts stay tied to real provider data.

Admin UI stays smaller.

Teams with missing Cursor data must fix Cursor/developer sync instead of entering local estimates.

Future versions can add manual overrides if real teams need them.

## Alternatives Considered

- Per-developer fallback limits: useful, but more UI and possible drift from Cursor.
- Team pool total override only: simpler, but cannot explain developer usage shares well.
