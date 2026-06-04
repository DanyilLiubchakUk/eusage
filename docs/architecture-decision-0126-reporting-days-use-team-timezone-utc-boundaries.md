# Decision 0126: Reporting days use team timezone with UTC boundaries

## Status

Accepted

## Context

Dashboard date ranges need one shared meaning for today, Last 7 days, and custom ranges.

Developers can be in different timezones.
Some providers expose timestamped local history that can be grouped by timezone.
Other providers expose only current quota, budget, credit, or percent-used state.

Storing only UTC calendar days would be simple, but it would make a team day run from local evening to local evening for many teams.
Using each developer's local day would match individual workdays, but a dashboard total called today would no longer be one shared 24-hour team window.
Splitting a daily total across another timezone is only safe when the provider source has timestamped records or supports timezone-aware regrouping.

## Decision

Exact moments are represented as UTC instants.

Dashboard calendar ranges use one Reporting Time Zone for the team.
A Reporting Day is one calendar day in that timezone.
The corresponding start and end instants are UTC boundaries.

Consumed usage should be assigned to Reporting Days only when the source can support that assignment.
For providers with timestamped or timezone-regroupable history, use the Reporting Time Zone when extracting daily consumed usage.
For providers that only expose current quota, budget, credit, or percent-used state, store the observed state with UTC period or capture times and do not split it into fake daily consumed usage.

Admin and TV should use the same Reporting Time Zone.
Viewer-local time can be used for formatting exact freshness timestamps, but it must not change which Reporting Day a usage value belongs to.

## Consequences

Dashboard today and date ranges have one shared team meaning.

Stored exact moments stay timezone-neutral and can be converted for display.

Codex and Claude daily consumed usage can move toward team Reporting Day buckets when their source supports timezone-aware grouping.

Cursor and JetBrains remain quota-state providers unless they later expose timestamped consumed usage.
Their samples show observed state over time, not split daily burn.

The dashboard must avoid claiming precision it does not have.
If a provider only reports a daily total without timestamped backing, eUsage must not divide that total across Reporting Days.

## Alternatives Considered

- UTC calendar days for dashboard ranges: simplest storage, but many teams would see local evening-to-evening days.
- Developer-local days: matches each person's local workday, but a team dashboard total called today would mix different 24-hour windows.
- Viewer-local dashboard days: convenient for one browser, but Admin and TV could disagree about the same team data.
- Split all daily totals across team days: looks precise, but is false when the source only provides already-aggregated daily totals.
