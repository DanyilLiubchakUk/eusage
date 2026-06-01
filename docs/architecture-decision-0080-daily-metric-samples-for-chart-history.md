# Decision 0080: Store daily source metric samples for chart history

## Status

Accepted

## Context

Usage snapshots keep the latest provider state per developer/device/provider/period.

That is enough for current-cycle values, but not enough for useful over-time charts once raw payloads expire.

Storing every raw usage upload would be too much for v1.
Storing chart aggregates that can be calculated from source values creates duplicate state.

## Decision

Add `metricSamples` for daily source metric history.

`metricSamples` stores small values, not raw payloads.
It stores source measurements needed for future calculations, not precomputed chart aggregates.

The desktop extracts metric sample source values before upload.
The backend validates them and upserts one row per team, provider, optional developer, metric key, provider period, and sample day.

Example fields:

```text
teamId
providerId
developerId optional
metricKey
value
unit
sampleDay
periodStart
periodEnd
summaryVersion
extractorVersion
capturedAt
updatedAt
```

Example Cursor metric keys:

```text
cursor.plan.used
cursor.plan.limit
cursor.onDemand.used
cursor.onDemand.limit
cursor.onDemand.remaining
cursor.onDemand.missingLimit
cursor.api.percentUsed
```

For the same day and metric, newer uploads overwrite older samples.

Each sample stores the same semver `summaryVersion` and provider-keyed `extractorVersion` model as `usageSnapshots`.

## Consequences

Admin and TV can calculate daily burn, spend pace, projected runout, spikes, and per-developer trends from stored source samples.

The system avoids immutable raw upload history.

Storage stays small for 2-5 person teams.

Metric extraction is desktop/provider-owned, must be provider-aware, and must avoid storing duplicate calculated values.

Charts can detect samples produced by older summary or extractor logic.

## Alternatives Considered

- Use only `usageSnapshots`: simpler, but weak over-time charts after snapshots move forward and raw payloads expire.
- Store every raw upload event: most complete, but too much storage and code for v1.
- Store precomputed chart aggregates: faster reads, but duplicate state and harder corrections.
