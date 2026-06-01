# Decision 0092: Admin Overview compact tables

## Status

Accepted

## Context

Admin Overview should include enough detail to scan what is happening without duplicating every focused page.

TV slides should stay large and readable, not table-heavy.

## Decision

Admin Overview includes compact tables:

- `Top Developers`
- `Provider Status`
- `Recent Syncs`

These compact tables are only for Admin Overview.

TV mode does not show compact tables.

## Consequences

Admin Overview gets useful scan-level detail.

Detailed management still lives on focused pages.

TV remains slide-based and readable.

## Alternatives Considered

- Add Cursor per-developer table too: useful, but Cursor Pool section already covers it.
- No compact tables: cleaner, but weaker all-up page.
