## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Polish the first-run SaaS experience after organization scoping works. Empty states should guide owners and admins through create developer, connect desktop, first sync, and TV setup. Validation should block invalid org names, roles, token labels, date ranges, and TV durations.

## Acceptance criteria

- [ ] No-data Overview guides the user to create a developer or connect desktop.
- [ ] Developers empty state explains developer tokens and connection strings.
- [ ] TV empty state guides display-link setup without leaking data.
- [ ] Validation blocks invalid Organization names, roles, token labels, custom dates, and slide durations.
- [ ] Tests cover empty states and validation errors.

## Blocked by

- 05-organization-desktop-connection

