## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Add the first Clerk Organization-aware app shell. Signed-in users should see a clear state for no active Organization, active Organization, and sign-out. The shell should prepare the app for organization switching without changing Convex data ownership yet.

## Acceptance criteria

- [ ] App shell shows current Organization context when Clerk has one.
- [ ] App shell shows a clear create/select Organization state when signed in with no active Organization.
- [ ] Signed-out users can still reach the public landing page.
- [ ] Existing `/overview`, `/developers`, and `/tv` auth states still work.
- [ ] Focused tests cover signed-out, no active Organization, and active Organization shell states.

## Blocked by

- 01-public-landing-overview-route

