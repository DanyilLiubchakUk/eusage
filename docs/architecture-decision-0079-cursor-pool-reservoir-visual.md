# Decision 0079: Cursor pool TV uses reservoir visual

## Status

Accepted

## Context

Cursor team credit pool is easier to understand as a shared resource than as a plain chart.

TV mode needs explanatory visuals that work from a distance.

Admin mode can still use precise tables and normal charts.

## Decision

The Cursor credit-pool TV slide uses a reservoir/pool visual.

The visual should show:

- Total pool.
- Used pool.
- Remaining pool.
- Developer usage share.
- Low/no-use developers.
- Small missing-data note when some developers do not report budget data.

Admin mode may also provide donut, bar, table, or trend views for precision.

## Consequences

TV communicates "shared pool being used" quickly.

Admin can still inspect exact values.

Missing data is visible without turning the slide into an error state.

Cursor pool needs provider-specific chart code.

## Alternatives Considered

- Donut chart plus leaderboard: clear, but less distinctive.
- Stacked bar: precise, but less explanatory for TV.
