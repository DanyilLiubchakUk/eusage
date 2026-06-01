# Decision 0050: Team connection is independent from provider readiness

## Status

Accepted

## Context

Windows v1 must support Codex, Cursor, Claude, and JetBrains AI Assistant.

A developer may install eUsage and connect to the team before provider apps are installed, signed in, or detectable on that machine.

Team connection proves that the desktop app can authenticate to the team deployment. Provider readiness proves that local usage can be collected. These are separate states.

## Decision

The desktop app allows team connection even when no provider is currently working.

Provider cards should show exact setup or error state.
For Cursor, v1 states include:

- `Setup needed`: Cursor app not found.
- `Signed out`: Cursor auth not found or invalid.
- `Unreadable`: Cursor storage exists but cannot be read or parsed.

Team sync status should show that the desktop is connected to the team, while also making clear when no usage has been uploaded yet.

Unsupported, unconfigured, or failing providers must not be hidden silently.

## Consequences

Developer onboarding can finish before local provider setup is complete.

Admins can see connected devices even before first usage data arrives.

Developers get clearer next steps for each provider.

The UI needs separate status surfaces for team connection and provider collection.

## Alternatives Considered

- Block team connection until one provider works: mixes connection with provider setup and creates poor onboarding.
- Silently hide failing providers: simpler, but hard to debug.
