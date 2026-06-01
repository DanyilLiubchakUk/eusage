# Decision 0003: Developers join with raw tokens in v1

## Status

Accepted

## Context

After the first admin bootstraps a team deployment, developers need to connect their desktop apps.

Invite links would provide a smoother experience, but they add link lifecycle rules, expiration, revocation behavior, and more UI. Developer access requests would add approval queues and notifications.

v1 should stay simple while still giving admins clear control over who can sync usage.

## Decision

In v1, the admin creates a raw developer token and sends it to the developer through an existing secure channel.

The developer pastes the token into the desktop app to connect to the team deployment.

## Consequences

This keeps onboarding simple to implement and easy to reason about for self-deployed teams.

The admin must copy and distribute tokens manually.

The UI should still make this feel intentional: token label, developer name, copy button, visible fingerprint later, revoke/rotate actions.

## Alternatives Considered

- Invite links: better UX, but more lifecycle and security surface.
- Developer access requests: polished, but requires approval flows and notifications.
