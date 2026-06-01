# Decision 0077: Admin Overview is dense analytics

## Status

Accepted

## Context

Admin Overview and TV mode serve different jobs.

Admin needs detail, filtering, and comparison. TV needs readable slides from a distance.

A sparse admin overview would undersell the product and make comparison work harder.

## Decision

Admin Overview starts as a dense analytics dashboard.

It is the all-up page for everything important.

It should support multiple charts/tables on one page, with filters for:

- Date range.
- Developers.
- Providers.
- Comparison mode.

Default sections:

- KPI strip.
- Team usage over time.
- Developer leaderboard.
- Provider breakdown.
- Cursor pool.
- Sync health.
- Compact detail tables.

TV mode remains a separate fullscreen slide experience.

Admin Overview does not auto-rotate like TV.

Admin Overview widgets are fixed in v1. Admins cannot drag/reorder widgets.

## Consequences

Admins can compare developer/provider usage without switching pages.

Focused pages still exist for deeper developer, provider, TV, and settings workflows.

Overview can include compact tables, but detailed controls stay on focused pages.

TV remains readable and curated.

The chart/query layer must support reusable datasets for both dense admin charts and simplified TV slides.

## Alternatives Considered

- Four core charts only: simpler, but weaker for detailed admin review.
- One summary chart: too weak for the product goal.
- Draggable admin dashboard widgets: nice, but extra state and UI for v1.
