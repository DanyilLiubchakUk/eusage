# Decision 0001: Self-deployed Vercel + Convex Cloud

## Status

Accepted

## Context

eUsage should be open source and self-deployable. Each team should host its own copy instead of signing up for a central eUsage SaaS.

The product still needs a polished admin and developer experience. The official v1 path should be easy enough for teams that do not want to operate servers.

## Decision

The official v1 deployment path is one Vercel project plus one Convex Cloud project per team.

eUsage will not run a central multi-tenant SaaS in v1. Each team owns its deployment, data backend, environment variables, and billing relationship with Vercel and Convex.

Advanced users may fork the repo and deploy differently, but the product docs and setup UI should optimize for the official Vercel + Convex Cloud path.

## Consequences

This gives teams a simple self-deployed path without requiring Docker, VPS management, Postgres backups, or Kubernetes.

The product is not fully self-hosted because Convex Cloud hosts the backend data. It is self-deployed: every team runs its own app/backend project instead of using a shared eUsage service.

The admin UX must make setup, invites, desktop connection, and dashboard access feel like a product, not a code sample.

## Alternatives Considered

- Central eUsage SaaS: best onboarding, but not the chosen open-source/self-deployed model.
- Docker Compose with self-hosted Convex: truer self-hosting, but more ops burden for v1.
