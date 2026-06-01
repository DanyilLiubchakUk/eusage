# Decision 0018: Keep all usage history in v1

## Status

Accepted

## Context

The dashboard should support many ways to compare developers, providers, and time ranges.

When a developer connects the desktop app, provider plugins may return usage history already present on that machine. The team dashboard should be able to use that historical data, not only data collected after the developer joined eUsage.

Retention limits would reduce dashboard flexibility and make "all time" comparisons incomplete.

## Decision

v1 keeps all synced usage history.

v1 does not include a hard-delete usage UI.

Admins can archive operational records or inactivate developers, but synced usage history remains available for admin review.

Full data reset or cleanup is manual in Convex for v1.

The dashboard should support all-time views and customizable filtering by developer, provider, and time range.

Ingest should preserve the captured usage period from provider data when available, so historical machine data can be placed on the correct timeline.

## Consequences

Dashboards can compare developers across all available synced history.

Storage can grow over time, especially because eUsage stores full payloads plus summary fields.

Future retention controls, archival, or rollups can be added later, but v1 should not delete synced history automatically.

Accidental UI clicks cannot destroy historical usage.

## Alternatives Considered

- Fixed retention window: easier storage control, but weakens all-time analysis.
- Keep summaries forever and raw payloads temporarily: better long-term storage model, but more work for v1.
- Hard-delete usage from admin UI: useful for mistakes, but too dangerous for v1 history and all-time reporting.
