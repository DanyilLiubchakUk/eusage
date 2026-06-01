# Decision 0071: Team config endpoint is public safe metadata

## Status

Accepted

## Context

The desktop app needs to verify a pasted team URL before storing the developer token.

Requiring bearer auth for team config would make URL validation depend on token validation, which gives worse connection UX.

The setup token is only for first admin bootstrap and must not be used for desktop setup.

## Decision

`GET /api/v1/team-config` requires no auth.

It returns only safe metadata:

- Team name.
- App version.
- API version.
- Endpoint paths.
- Supported desktop platform hints if needed later.

It must not return:

- Convex URLs.
- Clerk secrets.
- Setup token state.
- Developer tokens.
- Admin emails.
- Provider credentials.

Authenticated desktop endpoints still require `Authorization: Bearer ...`.

## Consequences

Desktop can validate a team URL before saving the token.

No secret data is exposed by team config.

Self-hosted setup stays easier to debug.

## Alternatives Considered

- Bearer token required: more private, but worse first-connect UX.
- Setup token required: wrong role; setup token is admin bootstrap only.
