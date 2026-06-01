# Decision 0082: Missing Cursor on-demand limits are excluded from fallback pool

## Status

Accepted

## Context

Cursor on-demand data is available only when Cursor returns `spendLimitUsage` with a positive individual or pooled limit.

The current Cursor plugin omits the On-demand line when no positive limit exists.

Treating a missing limit as `$0` would make team budget look lower than reality.

Hard failing the pool chart would hide useful data for developers who did sync valid limits.

Manual overrides would help fill gaps, but they can drift from Cursor and add more admin UI.

## Decision

When using the summed per-developer fallback pool:

- Include developers with valid Cursor on-demand limit data.
- Exclude developers missing Cursor on-demand limit data.
- Show a missing budget data count in admin and TV.

TV should show missing data as a small note, for example:

```text
4/5 developers reporting budget data
```

Do not treat missing limits as `$0`.

v1 does not include manual Cursor budget override UI.

To support accurate pool calculation, Cursor summary extraction should preserve:

```text
spendLimitUsage.limitType
spendLimitUsage.individualLimit
spendLimitUsage.individualUsed
spendLimitUsage.individualRemaining
spendLimitUsage.pooledLimit
spendLimitUsage.pooledUsed
spendLimitUsage.pooledRemaining
```

## Consequences

Pool totals avoid fake `$0` caps.

Admin and TV can still explain incomplete data.

The Cursor extractor must keep structured spend-limit fields, not only the rendered `On-demand` line.

If Cursor data is missing, admins fix Cursor/developer sync rather than entering local fake limits.

## Alternatives Considered

- Treat missing limit as `$0`: safe-looking, but inaccurate.
- Hide pool slide until every developer has limit data: accurate, but too brittle.
- Admin manually enters fallback limit per developer: useful later, but more UI and possible drift for v1.
