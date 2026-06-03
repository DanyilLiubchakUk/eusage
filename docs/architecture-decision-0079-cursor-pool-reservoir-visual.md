# Decision 0079: Cursor budget TV uses reservoir visual

## Status

Accepted

## Context

Cursor budget usage is easier to understand as a reservoir-style visual than as a plain chart.

TV mode needs explanatory visuals that work from a distance.

Admin mode can still use precise tables and normal charts.

## Decision

The Cursor budget TV slide uses a reservoir/pool visual.

The visual should show:

- Total pool or on-demand budget.
- Used pool or on-demand budget.
- Remaining pool or on-demand budget.
- Developer usage share.
- Low/no-use developers.
- Small missing-data note when some developers do not report budget data.

If provider-reported pooled fields exist, the slide may call the metric a shared pool.

If the view is built from summed per-developer on-demand values, the slide must call it `Team On-Demand Budget`.

If the summed on-demand budget has mixed developer billing windows, the slide must show `Mixed billing windows` and avoid one reset countdown or cycle pace projection.

Admin mode may also provide donut, bar, table, or trend views for precision.

## Consequences

TV communicates Cursor budget being used quickly.

Admin can still inspect exact values.

Missing data is visible without turning the slide into an error state.

Cursor budget needs provider-specific chart code.

## Alternatives Considered

- Donut chart plus leaderboard: clear, but less distinctive.
- Stacked bar: precise, but less explanatory for TV.
