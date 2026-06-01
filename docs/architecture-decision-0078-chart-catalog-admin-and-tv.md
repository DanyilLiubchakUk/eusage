# Decision 0078: Chart catalog supports admin analytics and TV slides

## Status

Accepted

## Context

eUsage needs to compare usage by developer, team, provider, and time range.

The same data should power dense admin analytics and readable TV slides.

Some providers need custom views, especially Cursor credit pool usage.

## Decision

Support chart families:

- Developer over-time comparison.
- All-developer team total over time.
- Provider/platform breakdown.
- Per-provider trend over time.
- Developer leaderboard for selected metric.
- Usage-limit pressure by developer/provider.
- Cursor credit-pool usage.

Admin charts can be denser and support tables/tooltips.

TV slide charts must be fewer per slide, larger, and more explanatory.

Cursor credit-pool TV slide should show:

- Total pool.
- Used pool.
- Remaining pool.
- Developer share of used credits.
- Low/no-use developers.

The Cursor pool TV visual should be a reservoir/pool visual, not just a normal bar chart.

Cursor pool calculation uses provider-reported pooled fields when present. If pooled fields are missing, eUsage falls back to summed per-developer on-demand limits and usage.

## Consequences

Dashboard can answer team-level and developer-level questions.

TV can show understandable credit-pool status without admin interaction.

Provider-specific chart modules are allowed when generic metrics are not enough.

Chart data should still come from normalized summary fields and redacted raw payloads.

Over-time and pool pace charts use daily derived `metricSamples`.

## Alternatives Considered

- Only generic charts: simpler, but misses provider-specific value like Cursor pool.
- Fully custom dashboard builder: flexible, but too much v1 UI.
