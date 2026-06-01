# Decision 0014: One owner in v1

## Status

Accepted

## Context

The first admin is created by Clerk login plus `SETUP_TOKEN`. Supporting multiple admins would require admin invitation, role management, removal, and audit behavior.

v1 should keep the admin model small while the self-deployed product flow is proven.

## Decision

v1 supports one owner per team deployment.

The owner can manage developer tokens, team settings, dashboard access, and TV mode.

Adding more admins is deferred.

## Consequences

The admin model is simple and avoids role-management UI in v1.

Teams that need shared admin access must share the deployment owner workflow outside eUsage until multi-admin support exists.

Future support for additional admins needs a new decision.

## Alternatives Considered

- Owner plus multiple admins: better for larger teams, but adds invite and role-management surface.
