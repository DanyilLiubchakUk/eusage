# ADR 0013: Owner creates teammate write tokens

## Status

Accepted

## Context

v1 uses manual token distribution. The setup UI is protected by `SETUP_TOKEN`.

Allowing teammates to self-register would require invite links, link expiration, abuse handling, and more public setup endpoints.

## Decision

The owner creates teammate write tokens manually in `/setup`.

The owner enters a teammate name, creates a write token, copies the raw token once, and sends it to the teammate through an existing secure channel.

## Consequences

The owner controls who can upload usage snapshots.

The implementation stays small: no invite links, no email flow, no public teammate signup.

Teammate onboarding requires owner action.

## Alternatives Considered

- Teammate self-registration: smoother onboarding, but too much security and UI surface for v1.
