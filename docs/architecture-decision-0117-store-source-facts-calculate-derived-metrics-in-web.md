# Decision 0117: Store source facts and calculate derived metrics in web

## Status

Accepted

## Context

eUsage needs all-time reporting, over-time charts, provider comparisons, and TV metrics.

Raw payloads are kept for 90 days only.
If the database stores only latest snapshots, old over-time values cannot be rebuilt later.

At the same time, storing every calculated dashboard value creates duplicate state and correction problems.

## Decision

Store source facts in Convex.
Calculate derived values in shared web metric functions.

Convex stores:

- Redacted raw payloads for 90 days.
- Normalized source fields in `usageSnapshots`.
- Daily source measurements in `metricSamples`.

Convex queries return source rows.

Shared pure TypeScript functions in `web/src/lib/metrics` calculate:

- Totals.
- Averages.
- Percent changes.
- Quota pressure averages.
- Cursor pool fallback totals.
- Burn, pace, projections, and chart aggregates.

Admin and TV must reuse those functions instead of calculating metrics inline in React components.

Do not store duplicate calculated values when they can be calculated from stored source values.

## Consequences

Database stays simpler.

Derived math lives in one web calculation layer.

All-time over-time charts still work because daily source measurements are retained.

Extractor code must preserve source inputs, not only rendered display strings.

## Alternatives Considered

- Store precomputed dashboard aggregates: faster reads, but duplicate state.
- Store only latest snapshots: simpler, but weak all-time history.
- Store raw payloads forever: flexible, but larger retention surface.
- Calculate in Convex queries: mixes storage/query code with presentation math.
- Calculate inline in React: fast first, but duplicates logic across Admin and TV.
