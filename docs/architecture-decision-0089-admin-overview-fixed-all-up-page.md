# Decision 0089: Admin Overview is fixed all-up page

## Status

Accepted

## Context

Admin needs multiple focused pages, but also one place to see everything important.

TV settings need drag/drop ordering, but admin analytics does not need a dashboard builder in v1.

## Decision

Admin has multiple pages by data type:

- `Overview`
- `Developers`
- `Providers`
- `TV`
- `Settings`

`Overview` is the fixed all-up page with everything important.

Overview includes:

- KPI strip.
- Team usage over time.
- Developer leaderboard.
- Provider breakdown.
- Cursor pool.
- Sync health.
- Compact detail tables.

Focused pages show deeper data and controls for their domain.

Admin dashboard widgets are not draggable/reorderable in v1.

## Consequences

Admin UX has one strong landing page and clear focused pages.

Implementation avoids dashboard-builder state.

TV slide ordering can still use drag/drop because that has a direct need.

## Alternatives Considered

- Admin widget drag/drop: flexible, but more state and support burden.
- One page only: simple at first, but too crowded.
