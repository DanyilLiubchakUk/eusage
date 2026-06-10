# Provider Account Sharing and Visibility

## Problem Statement

Developers can use multiple subscriptions or logins for the same AI provider, such as work and personal Claude, Codex, Cursor, or JetBrains AI Assistant accounts.

Today eUsage treats each provider as one local result. Connecting a team can imply syncing provider usage, and provider uploads are keyed by provider and period rather than by Provider Account. This creates privacy and correctness risk: a personal account may upload unintentionally, multiple accounts can be mixed or overwritten, and developers cannot clearly choose what appears locally versus what is shared with the Team Deployment.

Developers need a clear local account model that lets them see usage by Provider Account, name accounts in a way they understand, hide accounts locally, and opt in to sharing only specific accounts with the current Team.

## Solution

Add Provider Account support across Codex, Cursor, Claude, and JetBrains AI Assistant.

Each detected Provider Account gets a privacy-safe Provider Account Fingerprint, a local Provider Account Label, local Provider Account Visibility, and optional Provider Account Sharing consent for the current Team Deployment.

Team connection enables the ability to share, but does not upload any Provider Account until the developer selects accounts to share. Sharing starts off for every account after connect or reconnect. Shared accounts upload current data only; eUsage does not silently backfill older local history.

Settings owns local account management. The Team page owns team sharing consent. Provider pages show visible account usage in the existing metric-row style, separated by account labels. Home remains unchanged for this PRD.

## User Stories

1. As a developer, I want eUsage to detect separate Provider Accounts for the same provider, so that work and personal subscriptions are not mixed.
2. As a developer, I want each Provider Account to have a readable local label, so that I can recognize which account I am viewing.
3. As a developer, I want fallback labels like "Claude account 1" and "Claude account 2", so that every detected account has a stable display name before I rename it.
4. As a developer, I want account numbering to follow first-detected order, so that labels stay predictable.
5. As a developer, I want to rename Provider Accounts in Settings, so that account names match my own work and personal context.
6. As a developer, I want renamed labels stored locally, so that I do not rename accounts every time the app restarts.
7. As a developer, I want local labels to survive team disconnects, so that disconnecting from a team does not wipe my desktop setup.
8. As a developer, I want unshared account labels to stay local only, so that personal labels do not leak to the Team Deployment.
9. As a developer, I want the Team to see labels only for accounts I share, so that shared dashboard rows are understandable without exposing private accounts.
10. As a developer, I want changing the label for a shared account to update the Team quickly, so that dashboard labels do not stay stale.
11. As a developer, I want local label save to succeed even if team label update fails, so that my desktop label does not roll back because of network state.
12. As a developer, I want a visible failure when team label update fails, so that I know the Team still sees the old label.
13. As a developer, I want Settings to show Provider Accounts grouped by Provider, so that local account management is easy to scan.
14. As a developer, I want Settings to own "Show locally", so that I have one place to decide which accounts appear in the desktop app.
15. As a developer, I want Settings to show active, hidden, and not detected accounts, so that old or hidden accounts remain manageable.
16. As a developer, I want hidden accounts to stay collapsed and manageable, so that hiding an account does not make it impossible to find again.
17. As a developer, I want not detected accounts to stay listed in Settings, so that account labels and visibility preferences survive account switching.
18. As a developer, I want not detected accounts to be unavailable for sharing, so that eUsage does not upload accounts it cannot currently read.
19. As a developer, I want previously visible accounts to become visible again when redetected, so that temporary provider sign-out does not reset my preferences.
20. As a developer, I want previously hidden accounts to remain hidden when redetected, so that provider sign-in changes do not undo my local visibility choices.
21. As a developer, I want to forget not detected accounts, so that old local labels do not clutter Settings forever.
22. As a developer, I do not want to forget active detected accounts, so that I do not accidentally lose settings for an account still present.
23. As a developer, I want forgetting an account to remove only local account settings, so that provider credentials and already uploaded team data are not deleted.
24. As a developer, I want each provider page to show visible accounts in a scrollable list, so that I can review all visible accounts for that provider.
25. As a developer, I want each account section on a provider page to show the same metric rows eUsage shows today, so that the account view feels familiar.
26. As a developer, I want account sections separated by simple lines and account labels, so that the page stays compact.
27. As a developer, I want provider pages to show an account label even when only one account is visible, so that the account model stays consistent.
28. As a developer, I do not want rename or sharing controls on provider pages, so that provider pages stay focused on usage review.
29. As a developer, I want Home to remain unchanged in this PRD, so that the first account feature does not redesign the main overview.
30. As a developer, I want Team connection to show a sharing prompt, so that I choose what data leaves my machine.
31. As a developer, I want all Provider Accounts to start unshared after team connect, so that connecting a team does not imply usage sharing.
32. As a developer, I want all Provider Accounts to start unshared after reconnect, so that a rotated token or different team cannot silently resume sharing.
33. As a developer, I want the sharing prompt to look like the existing eUsage overlay style, so that onboarding feels native to the desktop app.
34. As a developer, I want to skip sharing during onboarding, so that I can connect the team now and decide later.
35. As a developer, I want closing the onboarding prompt to upload nothing, so that dismissal is privacy-safe.
36. As a developer, I want the Team page to own Provider Account Sharing, so that team consent is separate from local visibility.
37. As a developer, I want to share selected Provider Accounts from the Team page, so that I can opt in later after onboarding.
38. As a developer, I want sharing a selected account to upload immediately when current data exists, so that the Team sees data after I opt in.
39. As a developer, I want sharing to wait for the next successful provider probe when current data does not exist, so that eUsage does not send fake or empty data.
40. As a developer, I want retryable upload failures to keep pending shared account data in memory, so that transient network failures do not require reselecting accounts.
41. As a developer, I want unsharing an account to stop future uploads immediately, so that my consent change takes effect right away.
42. As a developer, I want unsharing to remove pending queued uploads for that account, so that data queued before the toggle is not sent after I opt out.
43. As a developer, I want unsharing to keep already uploaded team data, so that a simple toggle does not delete historical team records.
44. As a developer, I want clear text that unsharing stops future uploads but keeps previous team data, so that I understand the consequence.
45. As a developer, I want "Show locally" off to force "Share with team" off, so that hidden local data is never shared.
46. As a developer, I want not detected accounts to force sharing off, so that missing local accounts cannot keep uploading.
47. As a developer, I want invalid or revoked team tokens to clear local sharing records, so that broken team access cannot leave stale consent behind.
48. As a developer, I want disconnecting from a team to clear local sharing records, so that reconnect always starts private.
49. As a developer, I want sharing consent tied to the current Team, so that sharing with Team A does not imply sharing with Team B.
50. As a developer, I want the same provider account shared to different teams to have different backend fingerprints, so that teams cannot correlate accounts by shared hash.
51. As a developer, I want eUsage to avoid uploading raw account ids, emails, local paths, or credential source names, so that provider identity stays private.
52. As a developer, I want eUsage to upload only the hashed team account fingerprint for shared account identity, so that the Team can store rows without raw account identity.
53. As a developer, I want eUsage to use provider-owned identity when available, so that account recognition stays stable across token refreshes.
54. As a developer, I want eUsage to support lower-confidence identities when no better source exists, so that Claude and JetBrains can still participate.
55. As a developer, I want lower-confidence accounts to require confirmation before sharing, so that weak identity sources do not create silent mistakes.
56. As a developer, I want accounts with unclear default labels to require a better label before sharing, so that I know what I selected.
57. As a developer, I do not want technical source hints in normal UI, so that provider account setup is understandable without knowing local storage internals.
58. As a developer, I want account fingerprint changes to reset confirmation and sharing, so that switching accounts cannot silently share the new account.
59. As a developer, I want token refreshes not to change account fingerprints, so that normal auth refresh does not reset settings.
60. As a developer, I want label changes not to change account fingerprints, so that renaming does not detach usage history.
61. As a developer, I want Codex Provider Accounts identified from the best available account id, so that Codex multi-account support is reliable.
62. As a developer, I want Cursor Provider Accounts identified from email or user id when available, so that Cursor accounts are stable.
63. As a developer, I want Claude Provider Accounts identified from the best safe local identity source until a provider-owned id is available, so that Claude account switching is supported.
64. As a developer, I want JetBrains Provider Accounts identified from the best safe local quota/profile source until a provider-owned id is available, so that JetBrains can join the shared model.
65. As an admin, I want dashboards to show shared Provider Account labels, so that two shared Claude accounts are not indistinguishable.
66. As an admin, I want only shared Provider Accounts stored in backend metadata, so that unshared personal accounts are unknown to the Team Deployment.
67. As an admin, I want usage snapshots to include Provider Account identity, so that work and personal account rows cannot overwrite each other.
68. As an admin, I want provider account label changes to update without waiting for a new usage upload, so that dashboards reflect current shared labels.
69. As an admin, I want old uploaded usage retained when a developer unshares an account, so that historical reporting remains consistent.
70. As a future contributor, I want one shared fingerprint helper, so that each provider does not invent its own identity and privacy rules.
71. As a future contributor, I want fixed identity kinds, so that provider account fingerprinting remains testable.
72. As a future contributor, I want identity confidence stored locally, so that UI can require confirmation only when needed.
73. As a future contributor, I want no silent history backfill on first share, so that account consent stays narrow.
74. As a future contributor, I want a future explicit history-sharing flow documented, so that later work can add radio-button date choices safely.

## Implementation Decisions

- Build one shared Provider Account model across Codex, Cursor, Claude, and JetBrains AI Assistant in this PRD. Do not ship a Claude-only account model.
- Add a deep Provider Account Fingerprint module. It accepts a provider id, identity kind, identity value, local salt, and optional team fingerprint. It returns either a local fingerprint or a team-scoped fingerprint.
- Supported identity kinds are provider account id, provider email, provider user id, local profile path, and credential source.
- Supported identity confidence values are high, medium, and low.
- Use high confidence for provider-owned identifiers that stay stable across path and token changes.
- Use medium confidence for stable local profile paths or strong credential slots.
- Use low confidence for fallback slots that can collide or change.
- Use Codex account id as the best Codex identity source when available.
- Use Cursor cached email first and Cursor token subject/user id next when available.
- Use Claude provider-owned user id or email if it becomes available. Until then, use the best safe local provider home or credential slot.
- Use JetBrains provider-owned user id or email if it becomes available. Until then, use the best safe local quota/profile source.
- Local account fingerprints are stable on the desktop app and use a local salt.
- Team account fingerprints are stable only inside one Team and include a backend-provided team fingerprint.
- The team fingerprint must come from backend team metadata, not from the team URL.
- Uploads use the team account fingerprint in Provider Account metadata and data identity.
- Raw provider account ids, emails, local paths, credential source names, and technical source hints are not uploaded.
- Shared Provider Account labels upload only for accounts the developer shares.
- Unshared Provider Account labels and metadata remain local only.
- Provider Account Labels use fallback format "{Provider name} account {number}" when no clear provider label exists.
- Fallback account numbers follow first-detected order within the provider.
- Fallback labels are not considered clear enough for sharing when account identity is medium or low confidence.
- Do not show local path, keychain, quota file, JWT, or storage source hints in normal UI.
- Medium- and low-confidence accounts require user confirmation before sharing.
- Any account with an unclear default label requires a better label or explicit confirmation before sharing.
- A new account fingerprint resets user confirmation and sharing.
- Token refreshes and label edits must not change account fingerprints.
- Store local account records on the desktop app with provider id, local account fingerprint, label, visibility, identity confidence, confirmation state, first seen time, last seen time, and detection state.
- Store sharing consent on the desktop app keyed by team fingerprint, provider id, and local account fingerprint.
- Delete sharing consent when the developer disconnects from a team.
- Delete sharing consent when the backend rejects the team token as invalid, revoked, or inactive.
- Preserve local account labels and visibility when team sharing consent is deleted.
- Settings owns local Provider Account Visibility and labels.
- Settings shows Provider Accounts grouped by Provider.
- Settings separates visible, hidden, and not detected accounts.
- Settings sorts accounts by first seen time within each group.
- Settings allows forgetting only not detected accounts.
- Forgetting an account removes local account settings only. It does not delete provider credentials or team usage data.
- Provider pages show visible Provider Accounts only.
- Provider pages are scrollable lists of account sections using the existing metric-row style and simple separators.
- Provider pages always show the account label, even when only one account is visible.
- Provider pages do not own rename, local visibility, or sharing toggles.
- Home remains unchanged for this PRD.
- Team page owns Provider Account Sharing.
- Team connect opens an onboarding overlay after team verification.
- The onboarding overlay follows the existing eUsage modal overlay style.
- All Provider Accounts start unchecked in onboarding.
- "Skip for now", closing the modal, or pressing Escape uploads nothing.
- Turning on sharing updates Team Provider Account metadata immediately when current account detection exists, without raw payload or history rows.
- Turning on sharing uploads current account data immediately when current data exists.
- Turning on sharing without current data enables future upload after the next successful probe.
- Turning off sharing removes pending queued upload data for that account and stops future uploads.
- Turning off sharing does not delete already uploaded team data.
- First share uploads current data only. eUsage does not silently backfill older local history.
- A future explicit history-sharing flow may offer radio-button choices such as last 7 days, last 30 days, and custom range.
- Add backend Provider Account metadata for shared accounts only.
- Backend Provider Account metadata stores team, developer, provider, team account fingerprint, label, status, first shared time, last shared time, and updated time.
- Add a team API operation for immediate shared Provider Account metadata updates.
- The desktop app should call the team API for share-on metadata and shared account label changes. It should not talk directly to Convex.
- If immediate team metadata update fails, the local label or sharing choice remains saved and the Team keeps the old metadata until retry or a later successful update.
- Usage ingest must keep Provider Account identity distinct so multiple accounts for the same provider and period do not overwrite each other.
- Update team config or check-in response to provide a safe team fingerprint.
- Update product docs that currently imply team connect starts syncing local usage. Team connect enables opt-in sharing only.

## Testing Decisions

- Tests should verify external behavior: what accounts are shown, what uploads, what is stored, what is redacted, and what happens after connect, disconnect, account changes, and sharing changes.
- Do not test implementation details such as which React state hook stores a toggle or how a component internally maps rows.
- Test the shared Provider Account Fingerprint module as a deep pure module.
- Fingerprint tests must cover all identity kinds, local versus team scope, team-specific hash changes, stability across token refresh, and absence of raw identity values.
- Test provider extraction for Codex, Cursor, Claude, and JetBrains AI Assistant account records.
- Provider tests must cover identity kind, identity confidence, fallback labels, first-seen ordering, and redaction of raw identity values.
- Test local Provider Account registry behavior.
- Registry tests must cover first detection, rediscovery, hidden accounts, not detected accounts, forget behavior, label persistence, visibility persistence, and account fingerprint changes.
- Test Settings behavior for grouped accounts, rename, show locally toggle, not detected unavailable state, and forget only for not detected accounts.
- Test provider page behavior for visible accounts only, account title rendering for one account, multiple account sections, metric row reuse, and account ordering by first seen time.
- Test Team onboarding behavior for all accounts unchecked, skip behavior, close/Escape behavior, selected account upload, and no upload before opt-in.
- Test Team sharing behavior for immediate upload with current data, waiting for next successful probe without current data, unshare removing pending upload, and hidden/not detected accounts being unshareable.
- Test disconnect and invalid-token behavior clearing team sharing consent while preserving local labels.
- Test team label update behavior for shared accounts, including immediate update success, failure display, local save persistence, and no label upload for unshared accounts.
- Test backend Provider Account metadata creation and update for shared accounts only.
- Test usage ingest with two accounts for the same provider and period to prove no overwrite occurs.
- Test upload redaction to prove raw account id, email, local path, credential source, and unshared label values do not appear in team payloads.
- Existing prior art includes provider plugin source-fact/redaction tests, team sync payload tests, team connection action tests, usage ingest tests, dashboard source-row tests, Settings page tests, Team page tests, provider page tests, and shared dashboard metric tests.

## Out of Scope

- Home aggregation changes for multiple Provider Accounts.
- Admin dashboard redesign beyond showing shared account labels where needed.
- TV display redesign beyond using stored shared data consistently.
- Silent historical backfill when sharing is enabled.
- "Share history from this account" implementation.
- Hard delete of already uploaded Provider Account data.
- Restoring prior sharing choices after reconnect, even for the same Team.
- Uploading unshared account metadata.
- Uploading raw account ids, emails, local paths, credential source names, or technical source hints.
- Showing technical source hints in normal UI.
- Direct desktop-to-Convex writes.
- Per-provider-only rollout that ignores the shared account model.
- Full provider account merging UI.
- Manual admin controls for another developer's local Provider Account Sharing.

## Further Notes

- Current decisions intentionally favor privacy over convenience. Token rotation for the same Team will require developers to opt in again.
- Some providers have weak identity sources today. The feature still supports them, but requires user confirmation before sharing.
- Account labels are user-facing names, not identity. Labels can change and must not be used as account identity.
- Account fingerprints are identity, not display text. Fingerprints must not expose raw provider identifiers.
- Provider Account Sharing stops future uploads only. It does not delete already uploaded team data.
- The explicit future history-sharing flow should include a range choice, confirmation, and account-scoped proof before upload.
