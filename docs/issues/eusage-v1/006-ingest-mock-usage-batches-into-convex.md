# [AFK] Ingest mock usage batches into Convex

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/9

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

59, 60, 61, 62, 63, 64, 65, 67

## What to build

Build the first full ingest path using a mock provider payload: upload schema validation, redaction validation, raw payload storage, usage snapshot upsert, metric sample upsert, partial acceptance, and short-lived sync errors.

## Acceptance criteria

- [ ] A valid mock usage batch writes raw payload, usage snapshot, and metric samples to Convex.
- [ ] Every batch requires upload schema version, summary version, and per-provider extractor version.
- [ ] The same provider/developer/device/period/data identity overwrites the previous usage snapshot.
- [ ] A batch with one bad provider accepts valid providers and returns rejected provider IDs for invalid ones.
- [ ] Rejected provider details are stored in sync errors with expiry and without raw payloads or secrets.
- [ ] Tests cover valid ingest, upsert, partial acceptance, sync error expiry fields, and no raw-only provider rows.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/8
