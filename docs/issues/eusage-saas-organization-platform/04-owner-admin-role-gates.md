## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Add role checks for organization management actions. Owners and Admins can manage dashboard, developer, TV, and provider settings. Developer-only members cannot call admin mutations.

## Acceptance criteria

- [ ] Owner role can manage organization settings.
- [ ] Admin role can manage developers, providers, dashboard, and TV settings.
- [ ] Developer-only role cannot call admin mutations.
- [ ] Role failures return explicit results or loud errors, with no silent fallback.
- [ ] Tests cover allowed and rejected role paths.

## Blocked by

- 03-convex-organization-scope

