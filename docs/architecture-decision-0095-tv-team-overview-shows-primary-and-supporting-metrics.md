# Decision 0095: TV Team Overview shows primary and supporting metrics

## Status

Accepted

## Context

TV Team Overview should answer how the team is performing, but not hide other important signals.

One large primary metric helps readability. Supporting metrics keep the slide useful.

## Decision

TV Team Overview primary headline:

- Tokens burned plus estimated API cost in selected range.
- Percent change vs previous comparable range when available.

TV Team Overview supporting metrics:

- Cursor pool.
- Top provider.
- Active developers.
- Sync health.
- Compact available-metrics table with all available metric families.

All important metrics should appear across the TV slide set. Team Overview is not the only source of truth.

The table should show metric, value, source, and status in a small readable format.
Tooltips may explain metric meaning/source in interactive mode, but TV cannot require hover to understand the slide.

## Consequences

TV has a clear lead signal.

Admins still see all important team health and budget metrics.

The metric table makes mixed provider units visible without forcing a fake single score.

All-time range omits percent change but still shows current totals/supporting metrics.

## Alternatives Considered

- Cursor pool first: important, but provider-specific.
- Sync health first: important, but health rather than team performance.
