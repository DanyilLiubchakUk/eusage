# Decision 0081: Cursor pooled fields win over summed developer caps

## Status

Accepted

## Context

Cursor can expose team pooled fields such as pooled limit, pooled used, and pooled remaining.

Cursor can also expose per-developer on-demand limit and usage.

Summing per-developer limits is useful when no real team pool is available, but it can double-count or mislabel data when Cursor already reports a real pooled budget.

## Decision

For Cursor pool calculations:

1. If provider-reported pooled fields exist, use them for pool total, used, and remaining.
2. If pooled fields are missing, fallback to summing per-developer on-demand limits and usage.

Do not sum provider-reported pooled values across developers.

When falling back to summed per-developer on-demand values, exclude developers missing on-demand limit data and show a missing budget data count.

For each included developer, used value comes from `individualUsed` when present. If `individualUsed` is missing, use `individualLimit - individualRemaining`.

The fallback label should make the model clear:

```text
Team On-Demand Budget
```

instead of claiming a provider-reported shared pool.

## Consequences

Real Cursor team pool data stays accurate.

Teams without pooled fields still get useful budget visuals.

The dashboard avoids double-counting pooled values reported by multiple developers.

The pool chart avoids pretending missing limits are `$0`.

## Alternatives Considered

- Always sum per-developer limits: works for manual budget model, but can double-count real pooled data.
- Only use provider pooled fields: accurate when present, but useless when Cursor does not expose pooled fields.
