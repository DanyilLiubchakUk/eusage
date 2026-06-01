# Decision 0054: Provider support means readable when configured

## Status

Accepted

## Context

Windows v1 guarantees Codex, Cursor, Claude, and JetBrains AI Assistant.

A provider may be supported by eUsage but still show no data because the provider app or CLI is not installed, not signed in, or using an unsupported credential/storage version.

The product needs precise wording so users do not confuse local provider setup with eUsage platform support.

## Decision

"Supported on Windows" means eUsage can detect and read the provider when the provider app or CLI is installed and signed in using a supported local storage method.

For Cursor Windows v1, that means the Cursor desktop app is installed and signed in, and eUsage can read supported Cursor local storage paths.

If the provider is not installed, not signed in, or not readable, the provider card should show setup or error instructions.

Cursor provider card states:

- `Setup needed`: install Cursor and sign in.
- `Signed out`: open Cursor and sign in again.
- `Unreadable`: Cursor storage was found but eUsage could not read it.

Provider setup failure is separate from team connection failure.

## Consequences

Windows support claims stay honest.

Provider cards can guide users toward provider-specific setup instead of hiding failures.

Release notes and docs should avoid promising that providers work without local installation or login.

## Alternatives Considered

- Promise providers always work on Windows: impossible because local provider setup is outside eUsage.
- Avoid support labels: less precise and worse for onboarding.
