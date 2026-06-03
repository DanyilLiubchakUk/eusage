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
- Cursor budget.
- Sync health.

Rows stay stable so the team can see every supported metric family.
If a metric has no data yet, the value shows `No data yet` with status explaining why.

Provider percent usage is shown only when the provider reports a percent/window/quota value or the extractor can derive it from provider-reported limit and remaining values.

Do not invent percent usage for providers that only expose tokens, cost, credits, or requests.

Missing provider percent values are excluded from quota pressure and shown through coverage, not treated as `0%`.

Admin Overview also includes compact metric tables.

Quota pressure uses exact percent tiles. Each tile represents one provider metric and one window/scope, for example:

- `Claude 5h`.
- `Claude weekly`.
- `Codex session`.
- `Codex weekly`.
- `Cursor API`.
- `Cursor plan`.

Do not average unrelated percent windows together into one blended number.

Each exact percent tile can show:

- Average across visible developers reporting that exact metric.
- Worst developer for that exact metric.
- Coverage, for example `4/5 reporting`.
- Window/scope label, for example `5h window`, `weekly`, or `billing cycle`.

Quota pressure supports these exact-window aggregations on TV slides and Admin Overview:

- Per developer per provider.
- Per developer average across visible providers.
- Per provider team average across visible developers.
- Team average for one exact provider metric/window across visible developer reports.
- Worst active developer-provider pressure.
- High-pressure count.

TV Team Overview can show worst active pressure plus the top three exact percent tiles.
Example: `Worst Claude 5h 96% - Alex; Codex weekly avg 42%`.
Admin can show the full exact-window matrix/table with sorting and filters.

Quota pressure averages use a simple average of visible reported percent values only.
Visible means the current date range, selected developers, selected providers, hidden/inactive rules, and dashboard filters.
If a percent value is only a current provider window or billing-cycle value, show it with that scope label instead of pretending it is derived from the selected date range.
When daily percent samples exist, date range filters can aggregate those samples.
Missing reports are excluded from the average.
Coverage must be shown, for example `12/15 reporting`.
Per-developer averages use the same exact-window rule across visible providers and show provider/window coverage, for example `2/3 windows`.
Per-provider team averages use the same exact-window rule across visible developers and show developer coverage, for example `2/3 developers`.
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
