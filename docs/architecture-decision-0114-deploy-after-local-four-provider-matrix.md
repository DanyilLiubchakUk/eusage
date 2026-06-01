# Decision 0114: Deploy after local four-provider matrix works

## Status

Accepted

## Context

The app needs a real Vercel and Convex deployment before it is ready for teammates.

However, v1 MVP depends heavily on provider collection on macOS and Windows.
Deploying before local provider coverage works can create noisy setup/debug work.

## Decision

Deploy to Vercel and Convex after all four required providers work locally on macOS and Windows:

- Cursor.
- Codex.
- Claude.
- JetBrains AI Assistant.

After deployment, connect one macOS desktop and one Windows desktop to the deployed app before calling it ready for teammates.

## Consequences

Local provider work stays focused.

Deployment issues may surface later.

Ready-for-teammates still requires real deployment verification.

## Alternatives Considered

- Deploy after Cursor thin slice: finds hosting issues earlier, but interrupts local provider completion.
- Deploy before desktop sync works: too noisy.
