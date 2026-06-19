## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Make the public website entry a real eUsage landing page and move the existing signed-in dashboard experience to `/overview`. Keep setup, developers, and TV behavior working through the new app entry point.

## Acceptance criteria

- [ ] `/` renders a public landing page that explains eUsage and does not require setup state.
- [ ] `/overview` renders the existing setup/dashboard flow.
- [ ] App navigation points Overview to `/overview`.
- [ ] Setup-complete links point to `/overview`.
- [ ] A focused render test covers landing copy and primary actions.

## Blocked by

None - can start immediately

