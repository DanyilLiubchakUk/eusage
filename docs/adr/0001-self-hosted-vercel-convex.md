# ADR 0001: Self-hosted Vercel dashboard with Convex

## Status

Accepted

## Context

eUsage needs a hosted dashboard that is reachable by URL, not only on a local network. The first version should stay simple for small teams and open-source users. It should avoid a centrally managed eUsage cloud because that would require user accounts, billing boundaries, support operations, and stronger multi-tenant security before the desktop apps are even proven on macOS and Windows.

The hosted collector also needs durable storage. A local JSON file is enough for LAN testing, but not for serverless hosting.

## Decision

Each organization self-hosts its own eUsage web dashboard/API on Vercel. Convex is the durable backend for organization records, tokens, teammates, and usage snapshots.

The desktop app uploads usage to the organization's deployed URL. The TV dashboard reads from that same deployment.

## Consequences

This keeps v1 small:

- Each organization owns its deployment and data.
- eUsage does not operate a central multi-tenant service.
- Tokens can remain simple capability tokens for v1.
- Vercel gives the public URL.
- Convex provides durable storage and realtime-friendly reads.

Costs:

- Every organization must deploy its own instance.
- Setup needs Vercel and Convex project credentials.
- A managed eUsage cloud would need a later architecture decision.

## Alternatives Considered

- LAN-only collector: simpler, but does not meet the requirement for a stable URL outside the local network.
- Central eUsage cloud: better onboarding later, but too much auth, tenancy, billing, and operations for v1.
- Vercel with Postgres: durable and common, but more schema/query boilerplate than Convex for this small reactive dashboard.
