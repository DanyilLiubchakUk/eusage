# Decision 0057: Owner recovery is manual in v1

## Status

Accepted

## Context

v1 supports one owner per team deployment. The setup route is sealed after bootstrap and does not accept the setup token again.

If the owner loses Clerk access, the deployment still belongs to the team, but automatic owner recovery would require another high-trust flow.

Using the setup token as a recovery backdoor would weaken the sealed setup model.

## Decision

Owner recovery is manual in v1.

If the owner loses access, recovery is handled through deployment/database operations documented for advanced admins.

There is no in-app owner transfer or recovery UI in v1.

The setup token cannot reset or replace the owner.

## Consequences

The admin model stays simple and safe.

Losing owner access requires technical recovery.

Future multi-admin or owner-transfer support should be designed separately.

## Alternatives Considered

- Setup token recovery: convenient, but creates a backdoor after setup.
- Owner transfer UI: better long-term, but more role/account surface than v1 needs.
