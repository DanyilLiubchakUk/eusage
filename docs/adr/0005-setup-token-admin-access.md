# ADR 0005: Setup token for self-hosted admin access

## Status

Accepted

## Context

Each eUsage organization self-hosts its own Vercel and Convex deployment. The deployment needs an owner/admin path for creating the organization, teammate write tokens, and the dashboard read token.

Full sign-in would add accounts, sessions, invites, password or OAuth flows, and more security surface before v1 needs it. A stored admin password would still need session handling and password management UI.

## Decision

Use a single deploy-time `SETUP_TOKEN` environment variable for setup/admin access in v1.

The setup token lives only in hosting environment variables. It is not stored in Convex.

## Consequences

This keeps v1 admin access simple:

- The deployer creates a long random setup token.
- The deployer stores it in Vercel environment variables and a password manager.
- The setup page asks for the setup token before allowing organization and token management.

Costs:

- No named admin users.
- Anyone with the setup token can administer the deployment.
- Rotation means changing the environment variable and redeploying.

## Alternatives Considered

- Full sign-in: more complete, but too much product and security scope for v1.
- Admin password stored in Convex: requires password/session mechanics and is not meaningfully simpler than a setup token.
