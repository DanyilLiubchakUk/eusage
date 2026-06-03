# Decision 0078: Chart catalog supports admin analytics and TV slides

## Status

Accepted

## Context

eUsage needs to compare usage by developer, team, provider, and time range.

The same data should power dense admin analytics and readable TV slides.

Some providers need custom views, especially Cursor pool or on-demand budget usage.

## Decision

Support chart families:

- Developer over-time comparison.
- All-developer team total over time.
- Provider/platform breakdown.
- Per-provider trend over time.
- Developer leaderboard for selected metric.
- Usage-limit pressure by developer/provider.
- Cursor shared pool or on-demand budget usage.

Admin charts can be denser and support tables/tooltips.

TV slide charts must be fewer per slide, larger, and more explanatory.

Cursor budget TV slide should show:

- Total budget or pool.
- Used budget or pool.
- Remaining budget or pool.
- Developer share of used credits.
- Low/no-use developers.

The Cursor budget TV visual should be a reservoir/pool visual, not just a normal bar chart.

Cursor budget calculation uses provider-reported pooled fields when present. If pooled fields are missing, eUsage falls back to a summed per-developer on-demand budget aggregate.

When pooled fields exist, label the view as a shared Cursor pool.

When pooled fields are missing, label the view as `Team On-Demand Budget`, not a pool.

Cursor pool/on-demand budget total, used, and remaining represent the provider billing-cycle/current provider-window state. The selected dashboard or TV date range does not change those headline values.

Date range only affects Cursor budget history, pace, and developer share charts when daily `metricSamples` exist for that range.

Cursor budget UI must label this clearly, for example `Current billing cycle`, so it is not confused with a last-7-days total.

If the on-demand budget aggregate includes different developer billing windows, show `Mixed billing windows`; do not show a single reset countdown or cycle pace projection.

## Consequences

Dashboard can answer team-level and developer-level questions.

TV can show understandable Cursor budget status without admin interaction.

Provider-specific chart modules are allowed when generic metrics are not enough.

Chart data should still come from normalized summary fields and redacted raw payloads.

Over-time, budget history, and safe pace charts use daily derived `metricSamples`.

## Alternatives Considered

- Only generic charts: simpler, but misses provider-specific value like Cursor budget.
- Fully custom dashboard builder: flexible, but too much v1 UI.
