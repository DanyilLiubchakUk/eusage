# eUsage v1 Vertical Slices

Source PRD: [#3](https://github.com/DanyilLiubchakUk/eusage/issues/3)

These issues are dependency-ordered tracer bullets. Each slice is intended to be independently grabbable and demoable, while still moving through schema/API/UI/tests where that slice needs them.

## Summary

| Order | Issue | Type | Blocked by | User stories covered |
|---:|---|---|---|---|
| 1 | [#4 Build web setup shell and local dev loop](https://github.com/DanyilLiubchakUk/eusage/issues/4) | AFK | None | 1, 2, 66, 67 |
| 2 | [#5 Claim first owner with Clerk and setup token](https://github.com/DanyilLiubchakUk/eusage/issues/5) | AFK | #4 Build web setup shell and local dev loop | 2, 3, 4, 5, 6 |
| 3 | [#6 Create developer tokens and connection strings](https://github.com/DanyilLiubchakUk/eusage/issues/6) | AFK | #5 Claim first owner with Clerk and setup token | 7, 8, 9, 10, 11, 42, 43 |
| 4 | [#7 Manage developer token lifecycle](https://github.com/DanyilLiubchakUk/eusage/issues/7) | AFK | #6 Create developer tokens and connection strings | 12, 13, 14, 15, 16, 17, 18, 19 |
| 5 | [#8 Authenticate desktop API and record device check-ins](https://github.com/DanyilLiubchakUk/eusage/issues/8) | AFK | #6 Create developer tokens and connection strings | 55, 56, 60, 61, 63, 64 |
| 6 | [#9 Ingest mock usage batches into Convex](https://github.com/DanyilLiubchakUk/eusage/issues/9) | AFK | #8 Authenticate desktop API and record device check-ins | 59, 60, 61, 62, 63, 64, 65, 67 |
| 7 | [#10 Calculate shared dashboard metrics from source rows](https://github.com/DanyilLiubchakUk/eusage/issues/10) | AFK | #9 Ingest mock usage batches into Convex | 24, 25, 26, 40, 41, 66, 67 |
| 8 | [#11 Prove Windows tray shell](https://github.com/DanyilLiubchakUk/eusage/issues/11) | HITL | #4 Build web setup shell and local dev loop | 52, 53, 54, 68, 69, 70 |
| 9 | [#12 Connect desktop Team page to a team deployment](https://github.com/DanyilLiubchakUk/eusage/issues/12) | AFK | #8 Authenticate desktop API and record device check-ins<br>#11 Prove Windows tray shell | 42, 43, 44, 45, 46, 47, 48, 50, 55, 56 |
| 10 | [#13 Batch desktop probe uploads through team sync](https://github.com/DanyilLiubchakUk/eusage/issues/13) | AFK | #9 Ingest mock usage batches into Convex<br>#12 Connect desktop Team page to a team deployment | 49, 50, 62, 63, 64 |
| 11 | [#14 Sync Cursor source facts end to end](https://github.com/DanyilLiubchakUk/eusage/issues/14) | AFK | #13 Batch desktop probe uploads through team sync | 35, 38, 51, 58, 62, 68, 70 |
| 12 | [#15 Sync Codex source facts end to end](https://github.com/DanyilLiubchakUk/eusage/issues/15) | AFK | #14 Sync Cursor source facts end to end | 35, 37, 41, 62, 68, 70 |
| 13 | [#16 Sync Claude source facts end to end](https://github.com/DanyilLiubchakUk/eusage/issues/16) | AFK | #15 Sync Codex source facts end to end | 35, 37, 41, 62, 68, 70 |
| 14 | [#17 Sync JetBrains AI Assistant source facts end to end](https://github.com/DanyilLiubchakUk/eusage/issues/17) | AFK | #16 Sync Claude source facts end to end | 35, 37, 41, 62, 68, 70 |
| 15 | [#18 Apply provider and developer visibility filters end to end](https://github.com/DanyilLiubchakUk/eusage/issues/18) | AFK | #10 Calculate shared dashboard metrics from source rows<br>#17 Sync JetBrains AI Assistant source facts end to end | 20, 21, 22, 23, 24, 25, 26, 56, 57 |
| 16 | [#19 Build Admin Overview charts and metric tables](https://github.com/DanyilLiubchakUk/eusage/issues/19) | AFK | #18 Apply provider and developer visibility filters end to end | 24, 25, 26, 27, 28, 29, 56, 57 |
| 17 | [#20 Build TV slides, settings, playback, and freshness](https://github.com/DanyilLiubchakUk/eusage/issues/20) | AFK | #18 Apply provider and developer visibility filters end to end | 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41 |
| 18 | [#21 Verify deployed teammate readiness on macOS and Windows](https://github.com/DanyilLiubchakUk/eusage/issues/21) | HITL | #19 Build Admin Overview charts and metric tables<br>#20 Build TV slides, settings, playback, and freshness | 1, 52, 53, 54, 55, 70 |
| 19 | [#22 Detect and override desktop device name](https://github.com/DanyilLiubchakUk/eusage/issues/22) | AFK | #8 Authenticate desktop API and record device check-ins<br>#12 Connect desktop Team page to a team deployment | 55, 56, 57 |

## Local Issue Body Files

- [01 - Build web setup shell and local dev loop](eusage-v1/001-build-web-setup-shell-and-local-dev-loop.md)
- [02 - Claim first owner with Clerk and setup token](eusage-v1/002-claim-first-owner-with-clerk-and-setup-token.md)
- [03 - Create developer tokens and connection strings](eusage-v1/003-create-developer-tokens-and-connection-strings.md)
- [04 - Manage developer token lifecycle](eusage-v1/004-manage-developer-token-lifecycle.md)
- [05 - Authenticate desktop API and record device check-ins](eusage-v1/005-authenticate-desktop-api-and-record-device-check-ins.md)
- [06 - Ingest mock usage batches into Convex](eusage-v1/006-ingest-mock-usage-batches-into-convex.md)
- [07 - Calculate shared dashboard metrics from source rows](eusage-v1/007-calculate-shared-dashboard-metrics-from-source-rows.md)
- [08 - Prove Windows tray shell](eusage-v1/008-prove-windows-tray-shell.md)
- [09 - Connect desktop Team page to a team deployment](eusage-v1/009-connect-desktop-team-page-to-a-team-deployment.md)
- [10 - Batch desktop probe uploads through team sync](eusage-v1/010-batch-desktop-probe-uploads-through-team-sync.md)
- [11 - Sync Cursor source facts end to end](eusage-v1/011-sync-cursor-source-facts-end-to-end.md)
- [12 - Sync Codex source facts end to end](eusage-v1/012-sync-codex-source-facts-end-to-end.md)
- [13 - Sync Claude source facts end to end](eusage-v1/013-sync-claude-source-facts-end-to-end.md)
- [14 - Sync JetBrains AI Assistant source facts end to end](eusage-v1/014-sync-jetbrains-ai-assistant-source-facts-end-to-end.md)
- [15 - Apply provider and developer visibility filters end to end](eusage-v1/015-apply-provider-and-developer-visibility-filters-end-to-end.md)
- [16 - Build Admin Overview charts and metric tables](eusage-v1/016-build-admin-overview-charts-and-metric-tables.md)
- [17 - Build TV slides, settings, playback, and freshness](eusage-v1/017-build-tv-slides-settings-playback-and-freshness.md)
- [18 - Verify deployed teammate readiness on macOS and Windows](eusage-v1/018-verify-deployed-teammate-readiness-on-macos-and-windows.md)
- [19 - Detect and override desktop device name](eusage-v1/019-detect-and-override-desktop-device-name.md)
