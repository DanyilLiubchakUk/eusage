# Decision 0111: MVP done requires four providers on macOS and Windows

## Status

Accepted

## Context

The first thin slice proves the product loop with Cursor.
That is not enough to call the product MVP because v1 must work for Windows developers and cover the team’s required providers.

## Decision

v1 MVP is done only when these providers work on both macOS and Windows:

- Cursor.
- Codex.
- Claude.
- JetBrains AI Assistant.

After the Cursor thin slice, provider order is:

1. Codex.
2. Claude.
3. JetBrains AI Assistant.

Done means:

- Desktop team connection works.
- Provider reads real local data when installed and signed in.
- Desktop uploads usage.
- Admin shows provider/developer data.
- TV shows real synced data.
- macOS menu bar and Windows tray flows both work.

Each provider/platform pair must pass a manual checklist:

- Provider app or CLI installed.
- Provider user signed in.
- Provider card shows data.
- Team upload succeeds.
- Admin shows provider/developer row.
- TV includes the provider metric.

Ready for teammates additionally requires:

- Real Vercel deployment.
- Real Convex Cloud project.
- Clerk admin login working.
- One macOS desktop connected.
- One Windows desktop connected.
- Real synced data visible in Admin and TV.

## Consequences

The Cursor slice is a milestone, not MVP complete.

MVP scope is larger but matches the Windows/team requirement.

Provider/platform testing becomes part of the release bar.

Codex and Claude come before JetBrains because they unlock token/cost charts earlier.

Local proof is not enough to call it ready for teammates.

## Alternatives Considered

- Call MVP done after Cursor local proof: faster, but not enough for team use.
- Call MVP done after Vercel/Convex deployment proof only: proves hosting, but not provider coverage.
- JetBrains second: possible, but weaker for the token/cost dashboard story.
