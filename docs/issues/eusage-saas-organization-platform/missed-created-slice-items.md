# Missed Created Slice Items

Date: 2026-06-22
Branch: `dl/feat/eusage-saas-landing`

Scope: created issue docs only: `01` through `06`. This excludes PRD-only ideas and new grill/planning ideas.

## Branch Read

- Created SaaS issue docs now continue through `07-desktop-organization-connection-polish.md`.
- Branch includes implementation commits for slices `01` through `06`.
- Current dirty work is landing/theme preview work: `web/src/features/landing/landing-page.tsx`, `web/src/theme.css`, and `scripts/preview/`.

## Coverage

- `01-public-landing-overview-route`: covered.
- `02-clerk-organization-shell`: covered.
- `03-convex-organization-scope`: covered after the tenant-key decision below.
- `04-owner-admin-role-gates`: mostly covered, with one organization-settings gap below.
- `05-organization-desktop-connection`: partially covered; backend is ahead of desktop client behavior.
- `06-organization-empty-states-validation`: mostly covered; role validation depends on a future role-management surface.

## Missed Items

1. Slice `03`: tenant key wording needed a decision.
   Decision on 2026-06-22: SaaS v1 keeps `teamId` as the internal tenant data key and uses `Organization` as the product/auth term. No direct `organizationId` migration is required for this slice chain.

2. Slice `05`: desktop `team-config` still has a no-token path that reads the first team row.
   In a central SaaS, `GET /api/v1/team-config` without bearer auth has no safe Organization context. It should either return app-global metadata only or the desktop connection flow should send the developer token when fetching config.

3. Slice `05`: desktop client ignores Organization metadata.
   The web API response includes `organizationName` and `organizationFingerprint`, but desktop types/settings/UI still store and display `teamName` and `teamFingerprint`.

4. Slice `04`: no real organization-settings surface exists.
   Owner/Admin gates cover dashboard, developers, TV links, and TV/dashboard settings. If "Owner can manage organization settings" means rename Organization, slug, invites, or role membership, that has not been built in the created slices.

5. Slice `06`: invalid role validation is backend-only right now.
   Invalid role claims are rejected, but there is no role-management form to validate role input because invite/member management does not exist yet.

## Grill Question

Answered 2026-06-22: SaaS v1 keeps `teamId` as the internal tenant data key and treats `Organization` as the product/auth term.

Answered 2026-06-22: desktop `team-config` should use bearer auth when returning Organization-specific metadata. No-token config must not read the first team in hosted SaaS.

Answered 2026-06-22: Organization member management should use Clerk's built-in flow, customized with eUsage UI styling, instead of a custom membership system.

## Next Slice

`07-desktop-organization-connection-polish.md`

Created from missed slice `05` desktop connection gaps.

## Following Slice

`08-clerk-organization-management-ui.md`

Created from the Clerk Organization-management decision.
