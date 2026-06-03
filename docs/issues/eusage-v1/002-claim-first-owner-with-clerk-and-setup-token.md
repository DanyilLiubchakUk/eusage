# [AFK] Claim first owner with Clerk and setup token

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/5

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

2, 3, 4, 5, 6

## What to build

Implement the bootstrap path where a Clerk-authenticated admin enters the deploy-time setup token, creates the team, becomes the owner, and seals setup after success.

## Acceptance criteria

- [ ] A signed-in Clerk user can claim an unclaimed deployment with the correct setup token.
- [ ] The team row and owner admin row are created once and are visible to the dashboard shell.
- [ ] Wrong, missing, or reused setup tokens fail clearly and do not create a second owner.
- [ ] After setup completes, the setup route no longer accepts the setup token and links to the dashboard.
- [ ] Admin auth uses a shared shell that separates Clerk loading, signed-out, not-owner, and ready states.
- [ ] Normal admin reloads do not flash `Dashboard unavailable` or `not-authenticated` before real content appears.
- [ ] Tests cover success, wrong token, duplicate submit, and setup-complete behavior.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/4
