# Decision 0081: Cursor pooled fields win over on-demand budget aggregate

## Status

Accepted

## Context

Cursor can expose team pooled fields such as pooled limit, pooled used, and pooled remaining.

Cursor can also expose per-developer on-demand limit and usage.

Summing per-developer limits is useful when no real team pool is available, but it is not the same thing as a shared pool.

It can also mislead when developers have different billing-cycle windows.

## Decision

For Cursor budget calculations:

1. If provider-reported pooled fields exist, use them for pool total, used, and remaining.
2. If pooled fields are missing, show a `Team On-Demand Budget` aggregate from summed per-developer on-demand limits and usage.

Do not sum provider-reported pooled values across developers.

When falling back to summed per-developer on-demand values, exclude developers missing on-demand limit data and show a missing budget data count.

For each included developer, used value comes from `individualUsed` when present. If `individualUsed` is missing, use `individualLimit - individualRemaining`.

Cursor pool/on-demand budget total, used, and remaining are billing-cycle/current provider-window values from Cursor. Admin and TV date range filters do not alter those headline values.

When daily Cursor budget samples exist, date range filters can change budget history, pace, and developer share views. Those views must say which range they use.

The fallback label must make the model clear:

```text
Team On-Demand Budget
```

instead of claiming a provider-reported shared pool.

If included developers have different billing-cycle windows, the fallback aggregate must show `Mixed billing windows`, must not show one reset countdown, and must not show a pace/projection that assumes one cycle.

Desktop/Rust provider extraction should return raw Cursor spend-limit source facts, including pooled fields, individual fields, and reset/window fields when available. It should not pre-label summed on-demand values as a shared pool.

## Consequences

Real Cursor team pool data stays accurate.

Teams without pooled fields still get useful budget visuals.

The dashboard avoids double-counting pooled values reported by multiple developers.

The fallback chart avoids pretending missing limits are `$0` or pretending mixed individual budgets are one shared pool.

## Alternatives Considered

- Always sum per-developer limits: works for manual budget model, but can double-count real pooled data.
- Only use provider pooled fields: accurate when present, but useless when Cursor does not expose pooled fields.
