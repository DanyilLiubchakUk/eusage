# [HITL] Verify deployed teammate readiness on macOS and Windows

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/21

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

HITL

## User stories covered

1, 52, 53, 54, 55, 70

## What to build

Prove the actual ready-for-teammates path after the local provider matrix works: deploy to real Vercel, Convex, and Clerk, connect one macOS desktop and one Windows desktop, and verify real data in Admin and TV.

## Acceptance criteria

- [ ] A real Vercel deployment is connected to a real Convex Cloud project and Clerk app.
- [ ] The owner can sign in, setup is complete, and developer tokens can be created from the deployed app.
- [ ] One macOS desktop and one Windows desktop connect using production connection strings.
- [ ] Cursor, Codex, Claude, and JetBrains AI Assistant pass the provider-platform manual checklist on both supported platforms or documented blockers are filed.
- [ ] Admin shows real synced data, token status, developer status, provider status, and device sync status.
- [ ] TV shows real synced data on the default slides with correct freshness labels.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/19
- https://github.com/DanyilLiubchakUk/eusage/issues/20
