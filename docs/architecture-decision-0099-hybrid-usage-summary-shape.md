# Decision 0099: Usage summary uses common fields plus provider details

## Status

Accepted

## Context

Dashboard queries need common fields such as tokens, estimated cost, quota percent, credits, requests, and budget values.

Providers also expose details that do not fit every provider.
Cursor has plan/on-demand/pooled budget fields.
Codex and Claude have token/cost details.
JetBrains has credit/quota fields.

Fully strict summaries make provider work slow.
Fully flexible summaries make dashboard queries messy.

## Decision

Use a hybrid `usageSnapshots.summary` shape:

- Strict common fields for dashboard queries.
- Provider-specific nested details under `summary.provider`.

Each `usageSnapshots` row also stores:

- `summaryVersion`: semver string
- `extractorVersion`: provider-keyed semver object

Example:

```ts
{
  summaryVersion: "1.0.0",
  extractorVersion: {
    cursor: "1.2.0"
  },
  summary: {
    tokensTotal,
    estimatedCostUsd,
    budgetUsedUsd,
    budgetLimitUsd,
    quotaPercent,
    creditsUsed,
    creditsRemaining,
    requestsUsed,
    provider: {
      cursor: {
        onDemandLimitUsd,
        onDemandUsedUsd,
        pooledLimitUsd,
        pooledUsedUsd
      }
    }
  }
}
```

## Consequences

Common dashboard queries stay simple.

Provider-specific dashboards can use richer data without changing every provider.

Extractor code must map provider data into both common fields and provider-specific fields when available.

Version fields make it clear which rows were produced by older extraction logic.

Backfill is only possible while the related raw payload is still inside the 90 day retention window.

## Alternatives Considered

- Fully strict summary: clean, but too slow for provider differences.
- Fully flexible JSON: easy ingest, but bad dashboard query discipline.
- No summary/extractor version: simpler, but old rows become hard to reason about.
