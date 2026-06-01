# Decision 0085: Cursor fallback used value prefers explicit used

## Status

Accepted

## Context

Cursor on-demand fallback pool sums per-developer budget and usage when no provider-reported pooled fields exist.

Cursor may provide explicit `individualUsed`, or it may provide `individualLimit` and `individualRemaining`.

The screenshot-style UI can derive used from limit minus remaining, but explicit provider-used value should win when present.

## Decision

For each developer included in Cursor fallback pool:

1. Use `individualUsed` when present.
2. Otherwise use `individualLimit - individualRemaining`.

If neither used nor remaining can be derived, exclude that developer and count missing budget data.

## Consequences

The pool chart uses the best provider value available.

Screenshot-style data still works when explicit used is missing.

Missing data stays visible instead of becoming fake `$0`.

## Alternatives Considered

- Always `limit - remaining`: simple, but ignores explicit provider-used value.
- Require explicit `individualUsed`: strict, but too brittle.
