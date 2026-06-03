# [AFK] Manage developer token lifecycle

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/7

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

12, 13, 14, 15, 16, 17, 18, 19

## What to build

Complete the admin lifecycle for rotating, revoking, inactivating, re-enabling, and reviewing developers without deleting historical usage.

## Acceptance criteria

- [ ] Admins can rotate a developer token and the old token becomes revoked immediately.
- [ ] Admins can revoke a developer token and the developer becomes inactive.
- [ ] Admins can re-enable an inactive developer by generating a new token and connection string.
- [ ] Inactive developers remain visible in Admin through a review control and are hidden from TV even if they were previously included.
- [ ] Re-enable flow includes `Add back to TV`, checked by default.
- [ ] Tests cover rotate, revoke, re-enable, inactive status, and no hard-delete usage behavior.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/6
