# ADR 0003: Shared organization read token for v1

## Status

Accepted

## Context

The dashboard needs read access to organization usage. Full sign-in is intentionally out of scope for v1, and the TV dashboard should not use the setup token because setup access is too powerful.

Read access can be modeled as one shared organization token or separate tokens per device. Per-device tokens give better revocation, but require more setup UI before the core desktop and hosted dashboard flow is working.

## Decision

Use one shared organization read token for v1 dashboard access.

The data model should still allow multiple read tokens later.

## Consequences

This keeps v1 setup simple:

- The setup UI creates one dashboard token.
- The TV or dashboard browser uses that token to view organization usage.
- If the token leaks, the organization rotates the shared dashboard token.

Future work can add named read tokens per dashboard device without changing the meaning of read access.

## Alternatives Considered

- Per-device read tokens: better revocation, but more setup surface for v1.
- Setup token for dashboard reads: too powerful and not appropriate for a TV/browser.
- Public dashboard with no read token: too easy to leak team usage.
