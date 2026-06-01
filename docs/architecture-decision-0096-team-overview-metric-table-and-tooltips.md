# Decision 0096: Team Overview uses metric table with explanations

## Status

Accepted

## Context

Providers expose different usage units: tokens, estimated API cost, dollars, credits, requests, and percentages.

The TV Team Overview needs a strong headline, but the team also wants to see all useful metrics that are available.

Hover tooltips are useful in admin/interactive use, but TV wall display cannot depend on hover.

## Decision

TV Team Overview headline uses:

- Tokens burned.
- Estimated API cost.
- Percent change vs previous comparable range when available.

TV Team Overview also includes a compact available-metrics table.

Table columns:

- Metric.
- Value.
- Source.
- Status.

Table rows:

- Tokens burned.
- Estimated API cost.
- Provider budget/spend.
- Quota pressure.
- Credits.
- Requests.
- Cursor pool.
- Sync health.

Rows stay stable so the team can see every supported metric family.
If a metric has no data yet, the value shows `No data yet` with status explaining why.

Admin Overview also includes compact metric tables.

Quota pressure supports these aggregations on TV slides and Admin Overview:

- Per developer per provider.
- Per developer average across visible providers.
- Per provider team average across visible developers.
- Team average across visible developer-provider reports.
- Worst active developer-provider pressure.
- High-pressure count.

TV Team Overview can show quota pressure as team average plus worst active pressure.
Example: `Avg 42%; worst Claude 96% - Alex; Alex avg 82%`.
Admin can show the full matrix/table with sorting and filters.

Quota pressure averages use a simple average of visible reported percent values only.
Visible means the current date range, selected developers, selected providers, hidden/inactive rules, and dashboard filters.
Missing reports are excluded from the average.
Coverage must be shown, for example `12/15 reporting`.
Per-developer averages use the same rule across visible providers and show provider coverage, for example `2/3 providers`.
Per-provider team averages use the same rule across visible developers and show developer coverage, for example `2/3 developers`.
Worst active pressure shows both:

- Worst single developer-provider value.
- Worst per-developer average.

Example: `Claude 96% - Alex; Alex avg 82%`.

Quota pressure thresholds:

- Warning: `>=80%`.
- Critical: `>=95%`.

Metric rows should support tooltip explanations for:

- What the metric means.
- Which providers contribute.
- Whether the value is estimated or provider-reported.
- Unit and source.
- Which date range is used.
- Whether the value is complete or partial.
- Which aggregation is used.
- How many developer-provider reports are included.

TV slide labels must remain understandable without hover.
Tooltip content is optional help, not required meaning.

## Consequences

Team Overview stays understandable while showing mixed units.

Admin users can inspect definitions through tooltips.

TV users can still read core meaning from labels and the source/status columns.

The metric extractor must preserve metric family, unit, source, date range, provider coverage, and confidence.
Quota averages are pressure averages only; they are not spend averages.

## Alternatives Considered

- Single synthetic usage score: compact, but arbitrary.
- Hide mixed metrics behind detailed pages: cleaner TV, but loses useful signal.
