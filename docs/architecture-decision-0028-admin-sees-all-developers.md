# Decision 0028: Admin dashboard can see all developers

## Status

Accepted

## Context

Admins need to review all developer usage data. They may filter the admin dashboard to focus on specific developers, but hidden filters should not remove access to developer history.

TV/display mode is different: it is curated and may show only selected developers.

## Decision

The admin dashboard can see all developers.

Admin dashboard filters can focus on selected developers, but there is no global developer hide that removes a developer from admin review.

TV/display mode has separate developer visibility settings.

When an admin creates a developer, the create form includes `Add to TV`.

`Add to TV` is checked by default.

If checked, the new active developer is included in TV visibility.

If unchecked, the developer is created for Admin review and desktop sync, but stays hidden from TV until enabled in TV settings.

When a developer becomes inactive, they are hidden from TV even if they were previously included.

When an admin re-enables a developer, the re-enable flow includes `Add back to TV`.

`Add back to TV` is checked by default.

## Consequences

Admin review stays complete and trustworthy.

TV can still be curated for wall display.

Developer filtering in admin dashboard is a query/view filter, not a data visibility policy.

## Alternatives Considered

- Global developer hide: consistent with provider visibility, but weaker for admin review because it can hide people from all admin analysis.
