# Decision 0020: Use provider period, then day bucket fallback

## Status

Accepted

## Context

Usage snapshots are upserted by developer, provider, and usage period or equivalent data identity.

Some providers expose clear cycle or reset periods. Others may only expose current values without a usable period key.

Using upload timestamp as the key would create duplicate records every refresh for providers without periods.

## Decision

When provider data includes a clear usage period, cycle, reset date, or equivalent data identity, use it as the upsert key.

When provider data does not include a clear period, use a day bucket as fallback.

Example fallback key:

```text
developerId + providerId + yyyy-mm-dd
```

## Consequences

Providers with good period data preserve accurate historical periods.

Providers without period data still avoid duplicate rows every refresh.

Daily fallback may lose intra-day changes, but keeps v1 storage and dashboard behavior simple.

## Alternatives Considered

- Use upload timestamp as key: preserves every change, but duplicates refreshes and grows storage quickly.
