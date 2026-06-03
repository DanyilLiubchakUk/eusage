# Decision 0029: Inactive developers stay reviewable in admin

## Status

Accepted

## Context

Developers may leave the team, lose a token, or need access revoked. Revoking access should stop future sync, but should not delete historical usage.

Admin dashboard needs historical review. TV/display mode should stay clean and not show inactive developers by default.

## Decision

Revoked developers become inactive.

Inactive developers:

- Remain visible in admin dashboard through a "show inactive" control.
- Are hidden from TV/display mode by default.
- Keep historical usage data.
- Can be re-enabled by an admin issuing a new developer token.

When a developer becomes inactive, TV visibility is removed even if the developer was previously included.

When an admin re-enables a developer, the re-enable flow includes `Add back to TV`, checked by default.

## Consequences

Revocation stops future sync without losing history.

Admin can review inactive developers when needed.

TV stays focused on active developers.

Re-enabling creates or rotates the developer token instead of restoring old raw token material.

## Alternatives Considered

- Keep inactive developers visible everywhere: complete, but noisy for TV.
- Delete inactive developers: simple UI, but destroys history.
