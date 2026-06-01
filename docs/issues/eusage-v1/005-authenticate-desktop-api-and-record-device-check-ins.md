# [AFK] Authenticate desktop API and record device check-ins

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/8

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

55, 56, 60, 61, 63, 64

## What to build

Add the minimal desktop API surface for safe team config, bearer-token auth, device check-in, device disconnect, and device status visibility in Admin.

## Acceptance criteria

- [ ] The public team config endpoint returns only safe metadata and no secrets.
- [ ] Authenticated desktop routes verify bearer tokens by SHA-256 hash and derive developer identity from the token record.
- [ ] Device check-in creates or updates a device with developer, device ID, OS, app version, and last seen time.
- [ ] Device disconnect marks the device disconnected without deleting usage.
- [ ] Admin can see basic device status under the developer.
- [ ] Tests cover missing bearer auth, revoked token, safe team config, check-in, disconnect, and 72-hour stale calculation.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/6
