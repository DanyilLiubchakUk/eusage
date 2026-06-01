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

## Consequences

Admin review stays complete and trustworthy.

TV can still be curated for wall display.

Developer filtering in admin dashboard is a query/view filter, not a data visibility policy.

## Alternatives Considered

- Global developer hide: consistent with provider visibility, but weaker for admin review because it can hide people from all admin analysis.
