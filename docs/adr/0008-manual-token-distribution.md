# ADR 0008: Manual token distribution in v1

## Status

Accepted

## Context

After setup creates or rotates a teammate write token or dashboard read token, the owner needs to distribute that token. Invite links or email invites would improve onboarding, but add link security, email configuration, delivery failures, and more UI.

v1 is self-hosted for small teams, where the owner can manually share a token through an existing secure channel.

## Decision

The setup UI shows raw read/write tokens once with a copy button. The owner distributes tokens manually.

After the token creation or rotation modal is closed, the setup UI only shows token fingerprints and metadata.

## Consequences

This keeps v1 setup simple and avoids building invite infrastructure.

Owners must copy tokens into a password manager, secure chat, or direct handoff at creation time. Lost tokens cannot be recovered and must be rotated.

## Alternatives Considered

- Invite links: cleaner, but tokens can leak through URLs, browser history, logs, and screenshots unless more design work is done.
- Email invites: more polished, but requires email provider setup and failure handling.
