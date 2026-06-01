# Decision 0113: Ready for teammates requires deployed Vercel and Convex

## Status

Accepted

## Context

Local development can prove the product loop.
But teammates need the real self-deployed shape: Vercel app, Convex Cloud, Clerk auth, and desktop clients on both operating systems.

The team wants to avoid deploying before the full local provider matrix works.

## Decision

Before eUsage is called ready for teammates, it must run on:

- Real Vercel deployment.
- Real Convex Cloud project.
- Clerk admin login.
- One connected macOS desktop.
- One connected Windows desktop.

Admin and TV must show real synced data from those desktops.

Deployment happens after all four required providers work locally on macOS and Windows.

## Consequences

Release readiness tests the real deployment path after the local provider matrix works.

Windows and macOS client connection issues are caught before teammates rely on it.

Local-only proof remains a development milestone, not release readiness.

Deployment problems may appear later, but local provider work stays focused first.

## Alternatives Considered

- Local only: faster, but does not prove self-deployed team use.
- Deploy after Cursor thin slice: finds hosting problems earlier, but interrupts local provider completion.
