# Reporting Days With Team Timezone And UTC Boundaries

## Problem Statement

The dashboard can show different daily usage than the desktop app because exact sync times, provider daily usage, and dashboard date ranges do not share one clear day model.

When a developer works late in their local timezone, the desktop app can report usage that happened on their current day while the dashboard has already moved into the next UTC day. This can make "today" look cut off or shifted into tomorrow.

The issue gets harder with developers in different timezones. A team needs one shared dashboard meaning for today and Last 7 days, but provider data is not always detailed enough to split usage across another timezone safely.

## Solution

Use UTC for exact moments and a team Reporting Time Zone for dashboard calendar days.

The dashboard should define each Reporting Day in the team's Reporting Time Zone, then store and compare the corresponding day start and day end as UTC instants.

Consumed usage should be assigned to a Reporting Day only when the provider source supports that assignment. Codex and Claude can move toward Reporting Time Zone daily buckets because their local usage history can be grouped by timezone. Cursor and JetBrains should remain Observed Quota State providers unless they later expose timestamped consumed usage.

The dashboard should never fake a split. If a provider only gives one already-aggregated daily total and does not expose timestamped records, eUsage must not divide that total across Reporting Days.

## User Stories

1. As an Admin, I want today to mean one team Reporting Day, so that dashboard totals are stable.
2. As an Admin, I want Admin and TV to use the same Reporting Time Zone, so that both screens agree.
3. As an Admin, I want exact sync freshness to still be correct, so that I can trust whether data is stale.
4. As an Admin, I want late-night local usage to stay in the intended Reporting Day, so that today's totals do not look cut off.
5. As an Admin, I want a remote developer's usage handled predictably, so that cross-timezone teammates do not make charts misleading.
6. As an Admin, I want provider limits and quota states kept separate from daily consumed usage, so that budget pressure is not confused with token burn.
7. As a Developer, I want my desktop app to report usage without timezone surprises, so that my work is counted in the right dashboard range.
8. As a Developer, I want Codex and Claude daily usage grouped by the team Reporting Time Zone when supported, so that team totals match the dashboard day.
9. As a Developer, I want Cursor and JetBrains quota values shown as observed state, so that eUsage does not invent daily burn from cumulative values.
10. As a TV Viewer, I want today's dashboard to match the Admin dashboard, so that wall display numbers are trusted.
11. As a TV Viewer, I want freshness labels to show current time correctly, so that I can tell whether data is fresh.
12. As a future contributor, I want the date model documented, so that I do not reintroduce UTC-day or browser-local drift.
13. As a future contributor, I want daily consumed usage and Observed Quota State to have different rules, so that provider integrations stay honest.
14. As a future contributor, I want a tested Reporting Day module, so that timezone and DST edge cases do not leak into dashboard code.
15. As a future contributor, I want ingestion to validate bucket metadata, so that stored dashboard data keeps one clear meaning.

## Implementation Decisions

- Exact moments are UTC instants. This includes capture time, update time, sync freshness, provider reset times, and provider period start/end.
- Dashboard calendar ranges use one team Reporting Time Zone.
- A Reporting Day is a calendar day in that Reporting Time Zone.
- Reporting Day start and end are stored and compared as UTC boundaries.
- Admin and TV share the same Reporting Time Zone.
- Viewer-local formatting may be used for exact freshness timestamps, but it must not change which Reporting Day a usage value belongs to.
- Daily consumed usage must be bucketed by Reporting Day only when the provider source supports timezone-aware grouping or timestamped history.
- Codex and Claude should request timezone-aware daily grouping from their usage source when available.
- Cursor and JetBrains should continue as Observed Quota State providers. Their state samples show observed values over time, not split daily usage.
- Provider extraction remains desktop/provider-owned.
- Dashboard metric math remains shared between Admin and TV.
- Ingest should keep rejecting invalid source facts instead of silently accepting ambiguous day data.
- A small date-range module should own Reporting Time Zone, Reporting Day, and UTC boundary calculations.
- The default Reporting Time Zone should be captured during setup from the owner browser timezone and editable later in dashboard settings.
- Existing UTC timestamps should not be migrated into local timestamps. New bucket metadata should be added alongside exact UTC instants.

## Testing Decisions

- Tests should assert externally visible behavior, not internal helper shape.
- Date-range tests should cover Reporting Day boundaries in common timezones.
- Date-range tests should cover DST start and DST end days.
- Dashboard tests should prove Admin and TV resolve the same Reporting Day range from the same settings.
- Ingest validation tests should reject missing or malformed bucket metadata once the upload contract requires it.
- Provider tests should prove Codex and Claude pass timezone-aware grouping options to their usage source.
- Provider tests should prove Cursor and JetBrains do not emit fake daily consumed usage from quota state.
- Metric tests should prove daily consumed usage is included by Reporting Day boundaries, not browser-local date.
- Freshness tests should prove exact timestamps still format correctly and do not affect usage buckets.
- Prior test patterns already exist around provider source facts, metric samples, shared dashboard metric functions, and provider-specific plugin output.

## Out of Scope

- Rebuilding historical data that was already stored with ambiguous day semantics.
- Splitting provider daily totals when the source does not expose timestamped records.
- Event-level usage storage for every provider.
- Per-developer dashboard timezones.
- Viewer-local dashboard date ranges.
- Changing Cursor or JetBrains into daily consumed usage providers before their sources support it.
- Adding enterprise-grade timezone configuration flows beyond one team Reporting Time Zone.

## Further Notes

This PRD follows Decision 0126: Reporting days use team timezone with UTC boundaries.

The most important product rule is honesty: eUsage may regroup usage when the source can support it, but must not create fake precision.
