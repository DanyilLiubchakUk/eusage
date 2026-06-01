# Decision 0094: Date range comparisons use previous equal-length range

## Status

Accepted

## Context

TV and admin dashboard show date ranges such as Last 7, Last 30, Last 90, All time, and Custom.

Percentage deltas are only useful when there is a comparable previous period.

All time has no meaningful previous equal range.

## Decision

For comparison metrics:

- Last 7 days compares with the previous 7 days.
- Last 30 days compares with the previous 30 days.
- Last 90 days compares with the previous 90 days.
- Custom range compares with the immediately previous equal-length range.
- All time shows no percent-delta comparison.

## Consequences

Team usage percent change behaves predictably.

Admin and TV use the same comparison model.

All-time views avoid misleading percent changes.

## Alternatives Considered

- Compare everything to previous calendar period: familiar, but custom ranges become less predictable.
- No comparison deltas: simpler, but weaker performance signal.
