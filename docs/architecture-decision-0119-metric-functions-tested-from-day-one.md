# Decision 0119: Metric functions are tested from day one

## Status

Accepted

## Context

Metric calculations are product core.
They are pure TypeScript functions, so they are cheap to test.

Manual UI testing is not enough for calculations like Cursor pool fallback, quota averages, and date comparisons.

## Decision

Add unit tests for `web/src/lib/metrics` from day one.

Run web tests with:

```bash
bun test:web
```

Initial test coverage:

- Cursor pool calculation.
- Quota averages and coverage.
- Date-range comparison.
- Oldest-update formatting.

## Consequences

Admin and TV can rely on shared math.

Regression risk stays low while UI changes later.

Implementation should keep metric functions pure and easy to test.

Web tests stay separate from existing desktop/plugin test commands.

## Alternatives Considered

- Test later after UI works: risky because calculations are core.
- Manual UI testing only: too weak.
- Put web tests only under the repo-wide test command: simpler command list, but less clear web boundary.
