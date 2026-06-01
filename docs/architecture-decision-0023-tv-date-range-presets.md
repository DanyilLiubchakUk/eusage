# Decision 0023: TV display defaults to last 7 days with presets

## Status

Accepted

## Context

TV/display mode should show recent team activity by default. Current billing or provider cycles can vary across providers, and all-time views can be too broad for a wall display.

Admins still need flexibility to show broader history when useful.

## Decision

TV/display mode defaults to the last 7 days.

Admins can change the TV date range using presets:

- Last 7 days.
- Last 30 days.
- Last 90 days.
- All time.
- Custom range.

For Last 7, Last 30, Last 90, and Custom range, TV comparison metrics use the previous equal-length range.

All time does not show percent-delta comparison.

## Consequences

The default TV view focuses on recent activity.

Admins can still use all-time or custom ranges for demos, reviews, or long-term comparisons.

The dashboard query layer needs reusable date range handling for presets and custom ranges.

Comparison math is predictable across presets.

## Alternatives Considered

- Current billing cycle: useful for cost tracking, but provider cycles may differ.
- All time: useful for history, but weak as default TV signal.
