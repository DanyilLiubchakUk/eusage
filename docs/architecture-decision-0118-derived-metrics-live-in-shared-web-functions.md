# Decision 0118: Derived metrics live in shared web functions

## Status

Accepted

## Context

Admin and TV need the same derived metrics: totals, averages, percent changes, Cursor pool/on-demand budget, exact percent tiles, burn, pace, projections, and chart aggregates.

Convex should return source rows.
React components should not duplicate metric math inline.

## Decision

Derived metric calculations live in shared pure TypeScript functions under:

```text
web/src/lib/metrics
```

Admin and TV both use these functions.

Convex query functions return source rows and simple filtered datasets.

Metric functions must have unit tests from day one for:

- Cursor pool/on-demand budget calculation.
- Exact percent tiles and quota coverage.
- Date-range comparison.
- Oldest-update formatting.

## Consequences

Metric math is reusable and testable.

Admin and TV stay consistent.

Convex stays focused on storage/query boundaries.

Calculation bugs are caught before UI polish.

## Alternatives Considered

- Calculate everything in Convex queries: central, but mixes query/storage with presentation math.
- Calculate inline in React components: fast first, but duplicates logic quickly.
- Manual UI testing only: too weak for product-core math.
