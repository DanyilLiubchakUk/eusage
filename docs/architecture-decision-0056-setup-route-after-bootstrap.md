# Decision 0056: Setup route is sealed after bootstrap

## Status

Accepted

## Context

The setup token is used to prove control of a team deployment before an owner exists.

After the first owner is created, normal admin access uses Clerk. The setup token should not become a second admin login path or a reset mechanism.

## Decision

After setup is complete, `/setup` shows a setup-complete state and links to the dashboard.

It does not accept the setup token again.

Owner reset or ownership transfer is not part of v1.

## Consequences

The setup token has one narrow job: first owner bootstrap.

Reopening `/setup` after bootstrap is safe and understandable.

Accidental or malicious reuse of the setup token cannot reset the team.

If ownership transfer is needed later, it must be added as a separate explicit flow.

## Alternatives Considered

- Allow setup token to reset owner/team: powerful, but too dangerous for v1.
- Return 404 after setup: safe, but confusing for admins revisiting setup docs.
