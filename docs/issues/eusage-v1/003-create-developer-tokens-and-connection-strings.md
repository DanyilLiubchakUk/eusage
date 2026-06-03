# [AFK] Create developer tokens and connection strings

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/6

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

7, 8, 9, 10, 11, 42, 43

## What to build

Let the owner create a developer, generate one current developer token, see the raw connection string once, and later see only metadata and fingerprint.

## Acceptance criteria

- [ ] The Admin Developers page can create a developer with name, optional email, token label, metadata, and an `Add to TV` checkbox checked by default.
- [ ] If `Add to TV` is checked, the new active developer is included in TV visibility; if unchecked, they stay hidden from TV until enabled in TV settings.
- [ ] Creating a developer generates a high-entropy developer token and stores only its SHA-256 hash and fingerprint.
- [ ] The UI shows the raw token and connection string only immediately after create.
- [ ] Reloading or revisiting the developer row shows fingerprint, status, timestamps, and metadata, not the raw token.
- [ ] Tests cover token hashing, fingerprint display, connection string shape, and raw-token shown-once behavior.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/5
