## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Add the first eUsage-styled Organization management experience using Clerk's built-in Organization flow. The app should use Clerk's create, switch, invite, member, and role management boilerplate, but the visible shell should feel like eUsage.

## Acceptance criteria

- [ ] Organization switch/create/manage entry points live in the eUsage app shell or Settings surface.
- [ ] Clerk built-in Organization management remains the source of truth for members, invites, and roles.
- [ ] Clerk components are styled with eUsage appearance/theme/CSS so they do not look like an unstyled drop-in.
- [ ] Personal-account switching is hidden or clearly de-emphasized for the SaaS Organization flow.
- [ ] After create/select/leave Organization, users land on the correct eUsage route.
- [ ] Tests cover no Organization, create/select entry points, active Organization display, and role/member management entry visibility.

## Non-goals

- Custom membership database.
- Custom invite implementation.
- Billing.
- SSO.
- `organizationId` schema migration.
- Replacing Clerk built-in Organization internals with a fully custom UI.

## Blocked by

- 07-desktop-organization-connection-polish
