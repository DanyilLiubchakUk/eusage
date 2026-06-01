# Decision 0002: Setup token bootstraps the first admin

## Status

Accepted

## Context

Each team deploys its own eUsage instance on Vercel + Convex Cloud. The first admin must be created before the deployment has any users, invites, or auth configuration.

Email auth or OAuth would feel polished later, but requiring it before the product is configured would add setup work and provider-specific docs.

## Decision

The official v1 bootstrap flow uses a deploy-time `SETUP_TOKEN`.

The team sets `SETUP_TOKEN` as an environment variable. The first admin opens `/setup`, enters the setup token, and creates the initial admin/team setup.

After bootstrap, the setup token should not be used for normal developer access.

## Consequences

The first-run flow works for every self-deployed team without requiring an external auth provider.

The setup UI must clearly separate bootstrap access from normal admin/developer access.

The setup token must be treated as an owner secret. If leaked, the team should rotate it in the hosting environment.

## Alternatives Considered

- Email auth from day one: better long-term login UX, but adds provider setup before the first admin exists.
- GitHub OAuth only: convenient for some developer teams, but excludes non-GitHub teams and requires OAuth app setup.
