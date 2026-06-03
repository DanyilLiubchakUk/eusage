# Decision 0103: First TV proof shows Cursor on-demand budget

## Status

Accepted

## Context

The MVP TV proof needs one real metric from synced data.

Cursor exposes plan usage, on-demand usage, API percent, and pool/budget fields.

## Decision

The first minimal TV proof shows Cursor on-demand budget remaining.

After the end-to-end loop works, add plan usage and API percent to the TV/Admin metric tables.

## Consequences

The first demo proves the team-budget value, not just generic usage.

The first extractor work must preserve Cursor on-demand and pooled budget fields.

If Cursor returns provider-reported pooled fields, the UI can label the value as a shared pool.

If the value is summed from per-developer on-demand fields, the UI must label it `Team On-Demand Budget`.

## Alternatives Considered

- Cursor plan usage remaining: useful, but less team-budget focused.
- Cursor API percent: useful, but weaker as first TV proof.
- All Cursor metrics at once: nice, but more work before proving the loop.
