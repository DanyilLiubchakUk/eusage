# [AFK] Connect desktop Team page to a team deployment

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/12

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

42, 43, 44, 45, 46, 47, 48, 50, 55, 56

## What to build

Add the desktop Team page flow for pasting a connection string, validating team config, saving the raw token in OS credential storage, checking in the device, showing sync status, and disconnecting locally.

## Acceptance criteria

- [ ] The Team page accepts the approved connection string shape and rejects missing URL, missing token, wrong scheme, and unsafe URL inputs.
- [ ] A valid connection calls team config, confirms team name, stores raw token in OS credential storage, and stores only non-secret metadata in app config.
- [ ] The desktop sends a device check-in after connect and shows last contact status.
- [ ] Local disconnect removes local credentials, tries backend disconnect when online, and still succeeds offline.
- [ ] After disconnect or invalid-token response, the app does not auto-reconnect.
- [ ] Tests cover parser validation, credential-storage success/failure, disconnect, and invalid-token cleanup behavior.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/8
- https://github.com/DanyilLiubchakUk/eusage/issues/11
