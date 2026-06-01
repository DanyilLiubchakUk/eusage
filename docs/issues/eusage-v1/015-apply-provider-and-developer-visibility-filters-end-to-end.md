# [AFK] Apply provider and developer visibility filters end to end

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/18

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

20, 21, 22, 23, 24, 25, 26, 56, 57

## What to build

Implement the visibility and lifecycle rules that decide what Admin and TV show without changing collection or stored history.

## Acceptance criteria

- [ ] Global provider disable hides the provider from Admin and TV views but ingestion still stores new data.
- [ ] TV provider visibility can hide globally visible providers from TV only.
- [ ] Admin can review all developers and can include inactive developers when selected.
- [ ] Inactive developers are hidden from TV by default and remain reviewable in Admin.
- [ ] Date range, developer filters, provider filters, and inactive rules feed the shared metric layer consistently.
- [ ] Tests cover hidden provider still collected, TV-only provider hide, inactive developer Admin review, TV default hide, and filtered metric coverage.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/10
- https://github.com/DanyilLiubchakUk/eusage/issues/17
