# Decision 0097: TV slides show data freshness

## Status

Accepted

## Context

TV mode may stay open for hours or days.
Viewers need to know whether the slide data is fresh without opening admin tools.

## Decision

Every TV slide shows a small freshness label for the visible data used by that slide.

The label says how long ago the oldest and newest visible data on that slide updated.

Canonical label:

`Updates: oldest 12m ago · newest 4s ago`

Format uses days, hours, minutes, and seconds, but omits leading zero units:

- `9d 3h 4m 12s ago`
- `3h 4m 12s ago`
- `4m 12s ago`
- `12s ago`

If the oldest and newest timestamps are the same, omit duplicate wording:

`Updates: 12s ago`

The value is based on the oldest and newest timestamps among visible data rows used by that slide.
This uses normal persisted Convex row timestamps such as `usageSnapshots.updatedAt`, `metricSamples.updatedAt`, or device `lastSyncAt ?? lastSeenAt`.

Per-slide timestamp sources:

- Team Overview: visible `usageSnapshots` and chart `metricSamples`.
- Developer Leaderboard: visible developer/provider `usageSnapshots`.
- Provider Breakdown: visible provider `usageSnapshots`.
- Cursor Pool: visible Cursor `usageSnapshots`.
- Sync Health: visible devices using `lastSyncAt ?? lastSeenAt`.

Do not add a temporary freshness table.
Do not treat browser memory as the source of truth.
The web UI can keep `now` in memory and tick every second only to reformat the displayed age.
Normal Convex reactive queries update the base data when rows change.

If a slide has no data, show `Updates: No data yet`.

## Consequences

TV users can tell the worst and newest visible freshness for each slide.

The freshness label should be present on Team Overview, Developer Leaderboard, Provider Breakdown, Cursor Pool, and Sync Health.
Freshness status colors appear only on Sync Health.
Other slides show the freshness text without status color.

The dashboard needs a shared duration formatter so slides use the same wording.

Slide queries or selectors need to return the visible update timestamps for the slide.

## Alternatives Considered

- Only show freshness on Sync Health: simpler, but every other slide can look current when it is stale.
- Show full timestamp: precise, but harder to read on a TV.
- Store freshness separately in browser memory: easiest locally, but wrong after refresh or on another TV.
- Store temporary freshness rows in Convex: unnecessary because normal data rows already have timestamps.
- Color freshness on every slide: louder, but distracts from the slide content.
