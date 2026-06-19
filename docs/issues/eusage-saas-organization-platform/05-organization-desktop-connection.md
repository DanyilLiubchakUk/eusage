## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Make desktop connection metadata organization-aware. Developer tokens should map to one Organization, team config should return safe organization metadata, and uploads should never cross organization boundaries.

## Acceptance criteria

- [ ] Developer tokens are scoped to one Organization.
- [ ] Desktop team-config returns safe Organization name, app version, API version, and endpoint paths.
- [ ] Device check-in and usage batch uploads resolve Organization from the token.
- [ ] Invalid, revoked, inactive, or wrong-organization tokens fail clearly.
- [ ] Tests cover token-to-Organization mapping and cross-Organization rejection.

## Blocked by

- 04-owner-admin-role-gates

