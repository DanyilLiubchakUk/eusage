# ADR 0011: One organization per deployment in v1

## Status

Accepted

## Context

eUsage v1 is self-hosted. Each team deploys its own Vercel app and Convex backend.

Supporting multiple organizations inside one deployment would require stronger administration boundaries, organization switching, invite flows, and more careful token management.

The current v1 goal is a simple setup for small teams.

## Decision

Each Vercel + Convex deployment supports one organization in v1.

The data model may keep `orgId` fields so multi-organization support remains possible later, but the setup UI should not expose multi-organization management.

## Consequences

Setup stays simple: one owner, one organization, teammate write tokens, and dashboard read tokens.

If someone needs separate teams, they deploy separate eUsage instances.

Future multi-organization hosting would need a new architecture decision.

## Alternatives Considered

- Multiple organizations per deployment: more flexible, but adds tenancy and admin complexity before v1 needs it.
