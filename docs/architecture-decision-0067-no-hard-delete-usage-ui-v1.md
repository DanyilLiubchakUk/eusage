# Decision 0067: No hard-delete usage UI in v1

## Status

Accepted

## Context

eUsage v1 is built for small self-deployed teams that want all-time usage comparisons.

Hard-delete controls in the admin UI would help clean mistakes, but can accidentally destroy historical reporting.

Auto-retention would also conflict with all-time comparisons.

## Decision

v1 does not provide hard-delete usage controls in the admin UI.

Admins can:

- Inactivate developers.
- Archive device status records.
- Hide providers from dashboard and TV views.

If an admin creates duplicate developers for the same person, v1 uses manual cleanup:

- Inactivate the wrong developer.
- Create or rotate the token for the correct developer.
- Leave historical usage attached to the developer that originally reported it.

Those actions do not delete synced usage history.

Full data reset or cleanup is manual in Convex for v1.

## Consequences

All-time reporting stays reliable.

The admin UI avoids dangerous destructive actions.

Mistaken or unwanted synced data requires manual Convex cleanup in v1.

Future versions can add guarded delete/export/retention controls if real teams need them.

## Alternatives Considered

- Admin hard-delete developer and usage: useful for mistakes, but dangerous and edge-case heavy.
- Merge developers: useful, but risky because usage history, tokens, and devices all need migration.
- Auto-retention window: simpler storage control, but breaks all-time reporting.
