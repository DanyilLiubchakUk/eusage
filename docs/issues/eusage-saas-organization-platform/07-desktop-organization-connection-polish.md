## Parent

docs/prd/eusage-saas-organization-platform.md

## What to build

Polish the desktop connection path for hosted SaaS Organizations. The desktop app should fetch Organization-specific config with the developer token, store/display Organization metadata, and avoid any no-token path that reads one arbitrary team from a multi-Organization backend.

## Acceptance criteria

- [ ] Desktop config fetch sends the developer token as bearer auth before requesting Organization-specific metadata.
- [ ] `GET /api/v1/team-config` with bearer auth returns safe Organization metadata for that token's Organization.
- [ ] `GET /api/v1/team-config` without bearer auth does not read or return the first team in hosted SaaS.
- [ ] Desktop config parsing, saved settings, team page UI, provider-account sharing scope, and team-sync tests carry `organizationName` and `organizationFingerprint`.
- [ ] Existing `teamName` and `teamFingerprint` settings stay backward-compatible where needed for saved local settings.
- [ ] Tests cover authenticated config, no-token config behavior, desktop settings migration, and provider-account sharing scope.

## Non-goals

- Member invites.
- Billing.
- Full Organization settings.
- `organizationId` schema migration.
- Renaming every legacy desktop `team` symbol.

## Blocked by

- 06-organization-empty-states-validation
