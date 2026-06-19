# PRD: eUsage SaaS Organization Platform

## Problem Statement

The current product is mostly shaped around one team inside one deployment. The new product direction is a hosted SaaS where many organizations use one eUsage web app, connect desktop apps, and share usage data safely.

Admins need a clear home page, organization setup, member roles, dashboards, TV displays, and desktop connection flows. Developers need a simple desktop app and one connection string. The data model must stay safe for many organizations.

## Solution

Build eUsage as a hosted SaaS with Clerk for authentication and organization membership, and Convex for tenant-scoped data.

The public `/` route is a landing page. The signed-in app starts at `/overview`. Existing app pages stay simple:

- `/overview`: usage, spend, quota pressure, sync health.
- `/developers`: members, developer tokens, desktop connection strings.
- `/tv`: admin TV cockpit and display-link management.
- `/setup`: temporary bootstrap path until the full organization-create flow exists.

## User Stories

1. As a visitor, I want a clear landing page, so that I understand what eUsage does before signing in.
2. As a visitor, I want one clear app entry point, so that I can sign in and continue setup.
3. As an owner, I want to create an Organization, so that my team has isolated usage data.
4. As an owner, I want Clerk organization membership, so that auth and role membership are managed by Clerk.
5. As an owner, I want Convex rows scoped to my Organization, so that another Organization cannot read or write my data.
6. As an owner, I want to invite admins, so that another trusted person can manage developers and dashboards.
7. As an admin, I want an Overview page, so that I can see usage, spend, quota pressure, and sync health.
8. As an admin, I want a Developers page, so that I can create developer tokens and connection strings.
9. As an admin, I want a TV page, so that I can manage shared displays.
10. As a developer, I want one desktop connection string, so that setup stays simple.
11. As a developer, I want to choose what provider accounts are shared, so that personal usage stays private.
12. As a TV viewer, I want a read-only display link, so that team usage can be shown without admin controls.
13. As a maintainer, I want tenant indexes by Organization, so that queries stay efficient and safe.
14. As a maintainer, I want focused validation tests, so that bad org names, roles, tokens, and settings fail clearly.

## Implementation Decisions

### Organization Model

Use `Organization` as the product-facing tenant term.

Each Organization owns:

- admins and members
- developers
- developer tokens
- devices
- providers
- provider accounts
- usage snapshots
- metric samples
- dashboard settings
- TV settings and display links

Clerk owns login, organization membership, active organization context, and role claims. Convex owns product data. Every Convex read/write that touches customer data must be scoped to the active organization.

### Roles

Use three roles for the SaaS product:

- Owner: billing, organization settings, role changes, all admin actions.
- Admin: dashboards, developers, providers, TV, desktop connection setup.
- Developer: desktop app user whose usage can be shared with the organization.

Owners and Admins use the web app. Developers use the desktop app. A person can be both an Admin and a Developer.

### Required UX

- Home page explains eUsage and links to setup/sign-in.
- App shell shows current organization context.
- Signed-in users can create or choose an organization before seeing org data.
- Empty states guide the first useful action: create developer, connect desktop, first sync, open TV.
- Validation blocks bad organization names, duplicate slugs, invalid roles, invalid token labels, invalid date ranges, and invalid TV slide durations.
- Errors fail loud: visible message, no silent fallback.

### Data Requirements

- Add an organization identifier to every tenant-owned row.
- Keep existing team/developer/token/device/provider boundaries where possible, but route them through organization context.
- Index high-volume tables by organization first.
- Never query global tenant data and filter later in app code.
- Desktop tokens stay organization-scoped.
- TV display links stay organization-scoped and read-only.
- Provider Account fingerprints stay organization-scoped and privacy-safe.

## Testing Decisions

- Test user-visible behavior, not implementation details.
- Landing page tests should verify copy, primary links, and sign-in entry.
- Organization shell tests should verify signed-out, no active organization, active organization, and role states.
- Convex tests should prove every tenant read/write uses active organization identity.
- Role tests should prove Owner/Admin writes work and Developer-only access cannot use admin mutations.
- Desktop API tests should prove tokens map to one Organization and cannot cross tenants.
- TV display-link tests should prove links are read-only and organization-scoped.
- Provider Account tests should prove shared fingerprints remain organization-scoped and raw account values never upload.

## Migration Path

1. Public landing page and `/overview` app route.
2. Organization terminology in UI and docs.
3. Clerk active-organization shell and organization switcher.
4. Convex organization table/membership bridge.
5. Scope dashboard/developer/TV queries to active organization.
6. Replace setup-token bootstrap with organization creation.
7. Add owner/admin role checks to writes.
8. Update desktop team config to return organization-safe metadata.

## Out Of Scope For First Slice

- Billing.
- SSO.
- Enterprise provisioning.
- Cross-organization analytics.
- Data migration automation from old self-deployed installs.

## Further Notes

The old self-deployed Team Deployment docs remain useful as implementation history, but the SaaS target replaces "one deployment owns one team" with "one hosted app owns many Organizations."
