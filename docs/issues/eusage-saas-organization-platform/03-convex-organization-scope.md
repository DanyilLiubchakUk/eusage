## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Add the first Convex organization scope bridge. Tenant-owned queries and mutations should resolve the active Clerk Organization and use organization-scoped indexes before returning customer data.

## Acceptance criteria

- [ ] Convex has a durable Organization mapping for Clerk organization IDs.
- [ ] High-volume tenant tables are queryable by organization scope first.
- [ ] Dashboard source rows require an active Organization.
- [ ] Developer list/create paths require an active Organization.
- [ ] Tests prove another Organization cannot read or write scoped data.

## Blocked by

- 02-clerk-organization-shell

