# [AFK] Build web setup shell and local dev loop

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/4

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

1, 2, 66, 67

## What to build

Create the first runnable web/backend slice for eUsage. A maintainer can run the web command, see a setup-needed web screen backed by Convex dev state, and run web tests separately from the desktop tests.

## Acceptance criteria

- [ ] The repo has a web app entry that runs with the documented web dev command.
- [ ] Convex dev setup is wired enough to read a setup-needed/team-missing state.
- [ ] The first web screen renders setup-needed or setup-complete state from backend data, not hardcoded local UI state.
- [ ] Package scripts include the documented web dev and web test commands.
- [ ] A web test proves the setup-needed state and command-level wiring expected by later slices.

## Blocked by

None - can start immediately
