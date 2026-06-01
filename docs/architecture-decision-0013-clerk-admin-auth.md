# Decision 0013: Clerk is used for admin auth only

## Status

Accepted

## Context

Each team self-deploys eUsage on Vercel + Convex Cloud. Admins need a polished login flow, but developer desktop sync should stay simple and token-based.

Clerk can handle admin sign-up, sign-in, sessions, and password/OAuth UX. Using Clerk for developer desktop access would make desktop sync more complex and would not fit the one-string developer connection flow.

## Decision

Use Clerk for admin auth only.

The first admin flow is:

1. Team deploys eUsage with Clerk, Convex, Vercel, and `SETUP_TOKEN` environment variables.
2. Admin opens `/setup`.
3. Admin signs in or signs up with Clerk.
4. Admin enters `SETUP_TOKEN`.
5. If setup is not complete and the token is valid, that Clerk user becomes the deployment owner.

Developer desktop apps do not use Clerk. They use admin-created developer tokens.

## Consequences

Admin login is polished without building custom password/session code.

Every team deployment must also create and configure its own Clerk app.

The setup token remains necessary because Clerk proves identity, while `SETUP_TOKEN` proves ownership of the deployment.

## Alternatives Considered

- Local admin password: fewer external services, but more auth code to own.
- Setup token as permanent admin login: simple, but poor long-term UX and auditability.
