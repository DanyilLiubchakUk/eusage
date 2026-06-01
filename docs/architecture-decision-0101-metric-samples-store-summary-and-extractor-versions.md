# Decision 0101: Metric samples store summary and extractor versions

## Status

Accepted

## Context

`metricSamples` power over-time charts and TV comparisons.
Extractor and summary logic can change after samples already exist.

Without versions on samples, charts cannot tell whether old daily values came from old logic.

## Decision

Each `metricSamples` row stores:

- `summaryVersion`: semver string
- `extractorVersion`: provider-keyed semver object

This matches `usageSnapshots`.

## Consequences

Charts can identify older derived values.

Backfill can target old samples by version.

Sample rows stay small.

## Alternatives Considered

- No sample versions: simpler, but old chart data becomes hard to trust.
- Only extractor version: misses common summary shape changes.
