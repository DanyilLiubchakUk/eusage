# Decision 0024: Admin dashboard uses the same date range presets

## Status

Accepted

## Context

Admins need to review team usage data across recent and historical time ranges.

TV/display mode already supports last 7 days, last 30 days, last 90 days, all time, and custom ranges.

Using the same date range model across dashboard and TV mode keeps behavior predictable.

## Decision

The admin dashboard supports the same date range choices as TV/display mode:

- Last 7 days.
- Last 30 days.
- Last 90 days.
- All time.
- Custom range.

For Last 7, Last 30, Last 90, and Custom range, comparison metrics use the previous equal-length range.

All time does not show percent-delta comparison.

The default admin dashboard range can be chosen in dashboard config, but the available choices match TV mode.

## Consequences

Date filtering behavior is consistent across admin dashboard and TV mode.

The query layer can reuse one date range implementation.

Comparison math is consistent between admin and TV.

Admins can review both recent and all-time data without switching to a separate reporting system.

## Alternatives Considered

- Different admin-only ranges: more flexible, but adds inconsistency without a v1 need.
