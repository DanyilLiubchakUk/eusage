# Decision 0110: No developer merge UI in v1

## Status

Accepted

## Context

Admins may accidentally create two developer records for the same person.

Merging developers sounds simple, but it touches usage history, token ownership, device records, and audit trail.
Hard-delete is also risky because v1 needs all-time reporting.

## Decision

v1 does not include developer merge UI.

If a duplicate developer is created:

- Inactivate the wrong developer.
- Create or rotate the token for the correct developer.
- Keep existing historical usage attached to the developer that originally reported it.

## Consequences

Admin cleanup stays simple.

No risky migration UI is needed in v1.

Historical data may show the old duplicate developer in admin when inactive developers are included.

## Alternatives Considered

- Merge developers: useful, but too risky for v1.
- Delete wrong developer and data: dangerous and breaks history.
