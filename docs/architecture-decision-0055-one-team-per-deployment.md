# Decision 0055: One team per deployment

## Status

Accepted

## Context

eUsage v1 is self-deployed per team. Each team owns its own Vercel project, Convex project, Clerk app, and environment variables.

Supporting many teams inside one deployment would move the product toward a SaaS-style multi-tenant model. That would add org switching, per-org admin roles, cross-org isolation, and more complex token scoping.

v1 needs a simple model that fits small internal teams.

## Decision

One team deployment contains one team.

There is no org switcher and no multiple-team model in v1.

All developers, tokens, devices, provider visibility settings, dashboard config, TV config, and usage data belong to that one team.

## Consequences

The admin UI is simpler.

The database model can avoid multi-tenant org routing inside a deployment.

Self-deployed teams still have isolation because each team runs its own deployment.

Adding multiple teams inside one deployment later would be a larger product change.

## Alternatives Considered

- Multiple teams in one deployment: more flexible, but unnecessary for the self-deployed v1 model.
- No team record at all: simpler, but too weak for setup state and team-level settings.
