# Linux audit — 2026-10-10

Local fixes, Linux native compilation and available tests are complete. An isolated Wayland run reached frontend initialization; interactive desktop and Windows validation remain open. Attributable changes are now prepared as local commits for Danyil; the local-history handoff below records exclusions and checks. Reviewed all transferred tracked and untracked source/tests, using the handoff as context. No migration, duplicate checkout, push, merge, repository upload, release or deployment. This agent made no machine/service configuration changes. Preserved checkouts untouched. No real credentials or `.env.local` values accessed; tests used synthetic fixtures and cleared environments.

Environment evidence:

| Item | Observed value |
| --- | --- |
| Host | `eLink-danyil-linux` |
| Workspace | `/home/danyil-liubchak/Documents/eusage` |
| Audit-stage branch | `dl/fix/desktop-audit`; local-commit follow-up uses `dl/fix/desktop-audit-reviewed` |
| Transferred baseline | 18 modified files; 6 untracked source/test files; existing changes retained |
| OS | Linux `7.0.0-31-generic`, x86_64 |
| Parent process | `codex` PID 3132096, parent PID 3116985; latest review verification child PID 3231721 |
| Primary model | Latest T3 parent-turn runtime metadata: `gpt-6-astra`, `xhigh` |
| Earlier independent reviews | Geometry, ownership/cache, runtime: explicit `gpt-6.1-sol` / `xhigh` selections accepted at spawn; tools expose no separate serving-model attestation |
| Tools | Node 22.22.1; Bun 1.3.12; isolated temporary Rust 1.99.0 toolchain, without shell-profile or system-package changes |

Both question-answer turns that reported medium reasoning were stopped. This normal follow-up resumed after explicit Astra/xhigh runtime confirmation; the installation approval was retained. Read AGENTS.md, the relevant Tauri skills, Taste, Ponytail, Unslop, and the transfer handoff.

Changes retained or improved:

- **Popup geometry:** work-area-aware placement for four taskbar edges; monitor/DPI sizing; native Windows size cap before placement; current tray anchoring after resize; serialized frontend resize calls and listener cleanup. Tests cover negative monitor coordinates, reduced work areas, oversized popups, and stale async work.
- **Runtime:** shared hidden/bounded subprocess helper; remaining probe deadline passed through shell, environment, SQLite, discovery, and keychain operations. Timeout failures no longer become cached missing environment values. Probe concurrency is capped across batches; panic produces a provider error result. Blocking Team commands remain off the UI thread. Probe listener failures/unmounts reject pending refreshes; forced refresh cannot duplicate an in-flight request.
- **Sharing and ownership:** the wait-before-pruning fix is committed in `a77e364`, with attribution to Danyil's `b77b638`. Earlier exclusion notes below are historical. Side effects run outside React state updaters; stale reloads cannot overwrite toggles/reset. Check-in now rejects another developer's device, closing the bypass around upload/disconnect ownership checks. Only explicit connection retries once with a new device ID; startup/refresh never silently reassigns ownership.
- **Settings ownership:** Rust and frontend now share the existing Tauri plugin-store instance. Team connection, credential, and sharing mutations serialize in Rust; short snapshot/write locking keeps unrelated probe reads outside credential-prompt waits. Connection IDs reject stale replies, cleanup, queue entries, and consent after reconnect. The existing token fingerprint is checked before sending, so an interrupted replacement cannot pair another token with the old Team URL. Rollback preserves unrelated preferences and reports failures. Frontend action/sharing queues preserve call order; reloads await pending writes, and failed unshare/reset restores saved state. Registry salt creation and read/modify/write operations share one queue; user edits apply to the latest registry.
- **Web isolation:** the installed Convex adapter ignores appended organization query-key suffixes. Identity changes now clear query/mutation caches, replace the Convex client/subscriptions, and reset page state. Protected routes wait for backend-confirmed authentication. Regression tests cover user/session/org/role changes, late results, StrictMode, and real root-document SSR. Authentication failure retains retry/sign-out controls. Fixed the existing Clerk appearance type import.
- **Application security:** retained complete-header local HTTP validation and restricted browser origins; added a real split-packet TCP regression. Extended existing redaction to summary/coverage and provider field aliases; backend validation accepts only explicit redaction markers. No machine, service, authentication, network, or security settings changed.

Dependency follow-up:

- **Seroval 1.5.4 → 1.6.4**, pinned through a Bun override. All five TanStack/Seroval consumer resolution paths use the patched copy. The critical thenable issue is fixed from 1.6.2. A separate typed-array advisory lists 1.6.3, but source inspection and a safe eight-element fixture showed that release still accepts an invalid buffer source; 1.6.4 rejects it. Regression tests cover that case and plugin-produced thenables. Sources: [critical advisory](https://github.com/advisories/GHSA-p6vx-979v-rg4c), [typed-array advisory](https://github.com/advisories/GHSA-jp82-f5mq-hwhp), [maintainer source fix](https://github.com/lxsmnsyc/seroval/commit/8d357be89da3a4b88c0140ab1adeac138dbf28c8).
- **Vitest and coverage-v8 4.0.18 → 4.1.11**, including matching internals and required supporting packages. This also covers the later mocker advisory. Existing Vite 8 is reused; no framework upgrade/rewrite. The critical issue requires an exposed UI/API or Windows UI/browser mode; project scripts/configuration do not enable these. Sources: [UI/API advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp), [mocker advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- **Actual exposure:** the fresh production SSR bundle contains an empty server-function manifest and rejects unknown function IDs before Seroval deserialization. No reachable server-function input was found in this build; deployed manifests remain unverified. Tests ran without UI/API exposure. The targeted public npm advisory query returned no findings for the patched Seroval/Vitest/mocker/coverage versions; this is not a whole-dependency-graph audit.
- Updated `package.json` and `bun.lock` using the public npm registry, without reading authentication configuration or running install scripts. Required transitive changes include coverage tooling, lexer, Babel parser/types, and std-env. No unrelated direct application dependency was upgraded.

Earlier broad validation, before the final ten-reviewer refinements below:

| Check | Result |
| --- | --- |
| Desktop, plugin, Convex Vitest suite | 101 files; 1,392 tests passed |
| Web Vitest suite | 23 files; 118 tests passed |
| Desktop and web TypeScript | Passed |
| Desktop production bundle | Passed; main JS 711.36 KB minified / 208.31 KB gzip; size warning remains |
| Web production client/SSR/Nitro build | Passed with output in `/tmp`; no deployment |
| Isolated Rust backend harness | 173 tests passed; 2 environment-inspection tests excluded |
| Isolated Rust geometry/process/policy harness | 26 tests passed; overlaps backend coverage |
| Changed/new Rust syntax | All 28 files parsed; no whole-file formatting rewrite |
| Final peer review and `git diff --check` | Passed; remaining limitations listed below |
| Full Linux Tauri compilation/tests | Passed in the real project: 198 tests; 2 credential-environment tests excluded |
| Linux optimized build and unsigned DEB | Passed; package contents/dependencies verified without installing |
| Extracted Linux executable | All 122 loader dependency entries resolve; isolated Wayland startup reached frontend IPC and an empty probe batch. Interactive GUI remains unverified. |
| Linux AppImage creation | Blocked: local `patchelf` and `sqlite3` are absent; no installation attempted |

Earlier logs and temporary harnesses: `/tmp/eusage-audit.z4pGJA/`. Those harnesses compile actual source modules with direct dependency versions matched to the repository lockfile; the backend includes extracted dispatcher functions/tests from `lib.rs`. Temporary harness adaptations use QuickJS pre-generated bindings and enable the existing transitive `time` parsing feature. The follow-up subsequently compiled the full native Tauri project, including actual bindings, Wry/plugin-store types and IPC registration. The settings tests still use the synthetic memory adapter; no real settings or credential vault is used. Two existing writable-script fixtures needed closing before execution on Linux.

No live authenticated application launch, representative startup/RSS measurement, native screenshot, or Windows execution was performed. The bounded isolated startup check is detailed below.

Remaining findings and required follow-up:

1. **Windows placement and process lifetime:** auto-hide/overflow tray placement still infers the edge from icon distance when the work area equals the monitor. An inset bottom overflow icon can select the right edge. A third-party appbar reservation can also be mistaken for the taskbar; the concrete trigger is recorded below. Windows timeout kills the direct process; descendants and inherited-pipe reader threads can survive. The helper polls a deadline; Windows return timing and complete process-tree cleanup remain unverified. Resolve with native evidence before accepting Windows behavior.
2. **Crash durability:** the concurrent ownership/write race is fixed. Existing plugin-store still writes JSON with `fs::write`; sudden power loss can truncate it. Disk and the OS credential vault are not one crash-atomic transaction. Fingerprint/connection checks fail closed on mismatched state; explicit reconnect may be required. Already-selected HTTP requests cannot be recalled after unshare/disconnect.
3. **Linux native/package validation:** the main monitor reported the six approved development packages installed; local dpkg and pkg-config checks confirmed them. GTK 3.24.52, WebKitGTK 2.52.6, AppIndicator 0.5.94 and librsvg 2.61.3 resolve; libclang is present. This agent performed no installation, lock handling or password entry. The initial native build exhausted `/tmp` quota, so this task's target directory was moved to the main disk. The full locked native project then compiled and passed 198 tests, excluding two credential-environment tests. An optimized unsigned DEB was built, inspected and extracted for the isolated startup check below. No package was installed. AppImage creation remains separately blocked by absent `patchelf` and `sqlite3`; their installation is not approved or completed. [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [bindgen prerequisites](https://rust-lang.github.io/rust-bindgen/requirements.html).
4. **GitHub configuration:** CODEOWNERS and discussion links still name `usageboard`; confirm intended ownership/destination. CI omits web typecheck/tests and Rust compilation. The handoff's disabled scheduled workflow remains unverified: local `gh` has no active authentication. Danyil must use an already-authorized GitHub session to inspect/re-enable it if desired; no login/configuration attempted here. Public scheduled workflows can disable after inactivity ([GitHub documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)).
5. **Existing security/retention limits:** local HTTP access is restricted to loopback clients/origins, not authenticated per local user. Tauri CSP remains disabled, as configuration changes were excluded. Raw payload/error expiration fields have no scheduled cleanup. Review those policies separately.
6. **Remote label ordering:** local registry writes now serialize, but concurrent Team renames and previously queued usage batches can still deliver labels out of order. This pre-existing remote metadata issue is separate from the fixed settings-file race; no server revision protocol was added.

Windows acceptance checks: four edges with taskbar visible/auto-hidden; overflow tray; primary/secondary and stacked monitors with negative coordinates; 100/125/150/200% mixed DPI; unplug/replug and primary-display changes; oversized content and reduced work areas; repeated tray/shortcut opens, resize/focus loss, scroll and keyboard access. Observe process creation during cold start, refresh, SQLite/discovery and credential prompts: no console flashes, bounded returns, and no surviving descendants/readers after timeout. Recheck disconnect/reconnect during pending uploads and rapid sharing changes. Linux tests do not establish these results.

Keep Tauri. The desktop bundle is measured above; native startup/RSS and an equivalent GPUI implementation are not measured. GPUI would replace the existing React UI and platform integration; its own documentation describes a pre-1.0 API with frequent changes. No measured benefit supports a rewrite in this audit ([GPUI README](https://github.com/zed-industries/zed/blob/main/crates/gpui/README.md)).

Linux support follow-up: **implemented locally; full native compilation/tests passed.** The latest parent-turn runtime metadata remained `gpt-6-astra` / `xhigh`; hostname, workspace, branch and process were rechecked. Taste/Ponytail and the Tauri guidance were reread. This follow-up did not attempt installation or operate package locks/prompts.

`team_credentials_linux.rs` now implements the existing Team save/read/delete boundary using Secret Service 5.2.0 with encrypted DH transport. It uses the persistent default collection and scopes item attributes to eUsage, the existing service name and account. Existing tokens update in place. There is no plaintext file, transient-session fallback, collection creation or automatic unlocking. Locked/unavailable storage returns a fixed actionable error instead of `None`, preserving the connection and sharing settings. Duplicate or malformed entries require user cleanup in the keyring manager. The app never forwards provider error payloads. [Secret Service client](https://docs.rs/secret-service/5.2.0/secret_service/).

Calls run on existing blocking workers with a 15-second deadline covering connection and the operation. Provider authorization prompts remain possible; already-sent requests may finish after local timeout. Existing fingerprint checks protect interrupted connection replacement. Only Linux gains the new dependency; macOS/Windows credential implementations remain in place. Cargo.lock adds the required Rust crypto/math packages, retains zbus 5.14.0, and updates crypto-common 0.2.1 to 0.2.2 as required by the new cipher dependency. The direct zbus development dependency enables private peer-to-peer test connections, not production access to additional services.

Follow-up validation:

- Full native `cargo test --locked --offline --lib`: **198 passed**, two credential-environment tests skipped. This includes the five new Linux keyring cases, existing token normalization and ten settings ownership/rollback cases.
- The keyring fixture uses a private Unix socket pair and an in-memory fake Secret Service. It covers create/update/read/delete, exact attributes, unrelated-entry preservation, locked collection/item, unavailable service/default collection, duplicate/malformed values, provider failures and deadline cancellation. Fixtures use Plain transport for dummy values; production DH and real keyring interoperability still require an isolated desktop integration test.
- **26 focused frontend tests**, desktop TypeScript and production frontend build passed. The three new UI regressions preserve connection state when the keyring is locked.
- Workflow YAML/embedded shell parsing and merged Linux Tauri schema validation passed. Synthetic release checks accept complete assets and reject missing DEB signature, DEB manifest entry or AppImage manifest entry.
- Optimized Tauri `build --ci --no-sign --bundles deb` passed with `--locked --offline`. A temporary config skipped the frontend hook and used the existing environment-free frontend build. Existing Rust visibility/dead-code and frontend size warnings remain. No source workaround was needed for native compilation.
- Final read-only credential and packaging reviews accepted the changes. `git diff --check` passed.

Follow-up logs: `/tmp/eusage-linux-followup/`. Native target and compiler temporary files: `/home/danyil-liubchak/.cache/eusage-native-build.nyRMCV/`. This is build output, not another checkout. No application or provider probes were launched against user data.

Initial local DEB, before resource cleanup: **12,195,516 bytes**. The later rebuilt artifact and its current path are recorded below. SHA-256: `b8e2abddfc29610ee7fea784a999a4270f1287c3da806c3150512cb5ce696fa5`. Archive inspection confirmed an executable `usr/bin/eusage`, its desktop entry, all 18 plugin manifests, and dependencies `sqlite3`, `libayatana-appindicator3-1`, `libwebkit2gtk-4.1-0`, `libgtk-3-0`. Built on Ubuntu 26.04 without updater signatures; it does not establish Ubuntu 22.04 compatibility or update verification. No AppImage was produced.

Distribution uses **the existing eUsage repository and GitHub Releases; no new repository.**

| Current configuration | Linux implication |
| --- | --- |
| `.github/workflows/publish.yml` now includes Ubuntu 22.04 x64 | Builds `.deb` and AppImage with the locked Cargo dependencies; existing macOS/Windows targets remain. No workflow was run. |
| Linux-only workflow prerequisites and credential test step | Official Ubuntu build packages plus SQLite; private-bus Rust credential regressions run before packaging. |
| `src-tauri/tauri.linux.conf.json` | DEB declares `sqlite3`; AppImage copies `/usr/bin/sqlite3` before linuxdeploy collects its libraries. Existing helper lookup uses AppRun's PATH. Actual bundle still needs a smoke test. |
| Existing updater artifacts and GitHub `latest.json` endpoint | Linux verification requires both installers, both signatures and both installer-specific manifest entries. Signing configuration is unchanged. |
| Existing Homebrew generator | Still emits macOS-only artifacts. Linux users can use GitHub Releases directly; tap extension is optional follow-up. |

The Linux job uses explicit `--bundles deb,appimage`; RPM and ARM64 remain outside this bounded change. Ubuntu 22.04 provides an older compatible glibc baseline than this Ubuntu 26.04 workstation. Validate launch, tray, provider helpers, desktop integration and updates on that baseline. [Tauri pipeline](https://v2.tauri.app/distribute/pipelines/github/), [AppImage compatibility guidance](https://v2.tauri.app/distribute/appimage/).

For Linux users already using Homebrew, extend **the existing tap**: add the Linux AppImage URL/hash and `on_linux` / `app_image`, restricted to x86_64 while that is the only Linux build; put macOS URLs, hashes, minimum OS, `app`, and macOS-specific operations under `on_macos`. Update the generator and workflow download list together, because the generator overwrites the cask on every release. Current Homebrew documentation supports this; cross-platform casks must not keep a top-level macOS-only dependency. External tap contents and user Homebrew versions were not inspected. [Homebrew Cask Cookbook](https://docs.brew.sh/Cask-Cookbook#at-least-one-artifact-stanza-is-also-required).

Linux release readiness still requires package and desktop smoke tests. Test the bundled SQLite helper with a synthetic database; verify Team connect/reconnect/disconnect with an isolated test keyring on GNOME and a compatible KWallet session, locked/unavailable storage, prompt cancellation and timeout. Provider-specific Linux authentication/data paths remain outside this Team credential change. Test X11/Wayland tray menus, scaling, keyboard access and package-specific updates. The locked updater 2.10.1 supports AppImage plus privileged DEB/RPM installation paths. [Exact updater source](https://github.com/tauri-apps/plugins-workspace/blob/updater-v2.10.1/plugins/updater/src/updater.rs).

User-only prerequisites: use a desktop Secret Service provider with an unlocked persistent default keyring. No real keyring was queried, changed or migrated. No credentials or signing keys were accessed. The existing release signing references are reused; no new repository or secret is required for this configuration.

Keep apt-repository, Flathub and AUR infrastructure outside this minimal plan. Scoop remains the Windows channel. No new repository, package publication, signing-key handling or deployment was performed.

Bounded Linux validation follow-up:

- Latest parent-turn metadata explicitly reported `gpt-6-astra` / `xhigh`. Host, current checkout, branch and process matched the table above. Taste/Ponytail, project instructions and this report were reread. Existing GPT-6.1 Sol/xhigh reviewers performed focused read-only reviews; no conflicting edits.
- The DEB was extracted under `/tmp/eusage-smoke-3tlozvzc/package`, without installation or package scripts. Its executable SHA-256 is `16cf812b81c3b2995e7af58782d10b44c81d029e7914bd5db236b98ac33300c1`. The system ELF loader resolved 122 dependency entries with exit 0 and no missing libraries. This checks this Ubuntu 26.04 host, not the release workflow's Ubuntu 22.04 baseline.
- Isolation followed the source. Rust startup reads `~/.eusage/config.json` before loading app settings; frontend bootstrap normally probes default providers and checks autostart. Bubblewrap supplied a private filesystem, PID/network namespaces, synthetic passwd/home, temporary XDG directories and a cleared environment. All 18 providers were disabled in temporary settings; Team connection, shortcut and autostart were absent/off. The extracted package retained its resource layout. Host home, desktop sockets and session/system buses were not mounted. The test D-Bus had no service activation directories, so it could not auto-activate a real keyring provider.
- Without a display, the executable exited 101 at Tao's GTK initialization in 0.215 seconds. This is a display prerequisite failure, not a successful application start. Xvfb/Weston were absent. The installed GNOME Shell supported headless Wayland with a virtual 1280×720 monitor. Its first attempt failed without a system bus; the next attempt pointed both bus addresses at the private test bus, never the host bus.
- The isolated Wayland run reached `eUsage v0.6.29 starting`, read the temporary app settings, started the private loopback listener, launched WebKit processes, returned `list_plugins: 18 plugins`, and started a probe batch with `[]`. No provider ran. The 15-second observation ended through task-owned process termination, with 17.002 seconds including tracer cleanup. The recorded `-9` is the tracer's exit, not evidence of an application crash. Namespace teardown removed descendants; a subsequent process check found no executable/cwd under the task directory. Graceful Quit and persistence on normal shutdown were not tested.
- Logs contain missing desktop-service/CA warnings, software-renderer warnings, repeated `gtk_widget_get_scale_factor` assertions and `Glycin running without sandbox`. No sandbox-disabling flags or settings were used, and the outer Bubblewrap isolation remained in place. These warnings prevent treating this as full desktop or sandbox validation. Glycin documents an automatic fallback when nesting is blocked, but this run did not establish the exact cause. [Glycin release notes](https://github.com/GNOME/glycin/blob/main/NEWS).
- Reran the actual project's six `team_credentials` tests: all passed. The private Unix socket-pair fixture covers unavailable service/default collection, locked collection/item for read/save/delete without mutation, dummy credential lifecycle, unrelated-entry preservation, malformed/duplicate data, safe errors and deadline cancellation. No user bus or keyring was used. Production DH negotiation, provider prompts and real GNOME Keyring/KWallet interoperability remain unverified.

Evidence remains local in `/tmp/eusage-smoke-3tlozvzc/`: runner scripts, loader output, startup results and syscall traces. Credential rerun log: `/tmp/eusage-linux-followup/credential-validation.log`. AppImage remains blocked by missing `patchelf`/`sqlite3`; neither was installed during this follow-up. That bounded follow-up changed only this report; the later ten-reviewer refinements are recorded below.

Required desktop checks belong in a disposable Linux desktop account/session with test data and an isolated test keyring. This run did not attach to Danyil's current desktop or grant access to it.

| Area | Still needs a real desktop check |
| --- | --- |
| Startup and shutdown | Cold start from the desktop entry, one usable tray instance, reopening, normal Quit, persisted settings, representative startup/RSS, and the logged GTK/Glycin warnings. |
| GUI and tray | Visible rendering, tray/menu availability on GNOME and KDE, Show Stats/Settings, popup placement, focus/Escape, keyboard access, scrolling, scale changes and multiple monitors on X11/Wayland. Headless startup did not show or inspect these. |
| Credentials | With a user-prepared test provider/default collection and dummy data, verify encrypted create/read/replace/delete, locked/unavailable errors preserving Team/sharing state, cancelled prompts and timeout. Use a test Team endpoint for connect/reconnect/disconnect; no production credentials are needed for this check. |
| Desktop integration | Launcher/icon, explicitly requested login-start and shortcut behavior, suspend/resume, SQLite against a synthetic database, and signed package updates on the supported baseline. No package install, login-start change, shortcut registration or update was performed here. |

Windows findings were independently reassessed without changing Windows behavior:

1. **Overflow tray:** `panel/position.rs::nearest_monitor_edge` prefers reserved work-area edges, then falls back to icon distance. On a 1920×1080 monitor with equal monitor/work rectangles, an inset icon at `(1800,900,32,32)` selects Right even if the actual taskbar is Bottom. The existing overflow regression reserves bottom work area and misses this ambiguity. All 11 current geometry tests passed independently. A localized fix is feasible: obtain trustworthy monitor-specific taskbar-edge evidence and pass an optional edge hint into the pure placement function, preserving real work-area clamping. `ABM_GETAUTOHIDEBAREX` is a candidate source for auto-hidden bars; query the selected monitor's edges and reject missing/ambiguous results. It reports appbars, so the returned bar must also be established as the relevant taskbar. `ABM_GETTASKBARPOS` alone cannot select a secondary monitor. Add regressions for four inset corner positions, negative coordinates, absent/ambiguous hints and unchanged bounds. Actual Explorer overflow rectangles, API behavior, taskbar transitions and mixed DPI still require Windows. [Monitor-specific auto-hide API](https://learn.microsoft.com/en-us/windows/win32/shell/abm-getautohidebarex), [taskbar-position API](https://learn.microsoft.com/en-us/windows/win32/shell/abm-gettaskbarpos).
2. **Descendant processes:** `plugin_engine/process.rs::terminate` kills a Unix process group, but only the direct child on Windows. Descendants can retain stdout/stderr while detached readers survive a returned timeout; repeated failures can accumulate beyond the probe concurrency limit. Its four tests and the ccusage descendant-death regression are Unix-only. The polling deadline covers output collection, but synchronous spawn and cleanup wait have no separate deadline. A sound Windows fix is feasible with one non-inheritable job per invocation, kill-on-close, and assignment during process creation through `PROC_THREAD_ATTRIBUTE_JOB_LIST`. Keep the job through collection and close it on every exit path, including success after the parent exits. Assigning an already-running child leaves a race. This needs a focused Windows process owner preserving arguments, environment, pipes and `CREATE_NO_WINDOW`, not a framework rewrite. Tests need synthetic parent/descendant helpers, inherited pipes, repeated timeout/output-limit failures, existing-job behavior, and proof that unrelated processes survive. Native Windows must establish handle/thread cleanup, timing and console visibility; Linux tests cannot. [Job semantics](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [assignment during creation](https://devblogs.microsoft.com/oldnewthing/20230209-00/?p=107812).

Both Windows fixes remain proposed work. This bounded follow-up validated and explained the findings; it did not implement untested platform changes.


Ten-reviewer follow-up, 2026-10-10:

The latest parent-turn T3 metadata explicitly confirmed `gpt-6-astra` / `xhigh`. Host `eLink-danyil-linux`, workspace and branch above were rechecked; Codex PID 3132096, parent 3116985, verification child 3231721. No checkout switch or additional coordinator. Taste/Ponytail guided the refinements.

Provenance was established before review. Current and preserved checkouts share HEAD `f05866fe6c995e253dfea51d1ae5a0f3b49813d6`. Reconstructing the 18-file transfer patch and six-file source/test archive reproduced all 24 transfer-manifest hashes. The initial review snapshot contained 89 changed files: nine transferred unchanged, 15 transferred with Linux refinements, 48 other tracked Linux refinements, and 17 new Linux files. It includes source, tests, workflow, locks and this report. The final accessibility regression adds one new test file.

The preserved user's four dirty files matched `original-state.json` and were excluded: `CONTEXT.md`, `docs/architecture-decision-0129-clerk-organizations-for-workspaces.md`, `docs/grill/hosted-saas-redesign.md`, and `docs/prd/eusage-saas-developer-token-device-access.md`. No preserved file was changed. Attribution remains ambiguous for the transferred sharing-startup/readiness hunks in `App.tsx`, `use-provider-account-settings.ts`, `use-provider-account-sharing.ts` and its test: the handoff calls that work previously unpublished and preserved. Later Linux hunks were isolated separately. Other transferred audit changes have handoff/patch attribution, not independent per-hunk author timestamps. The entire HEAD diff was not assumed to be newly assistant-authored.

Exactly ten fresh reviewers launched in batches of at most three. Every launch explicitly requested `gpt-6.1-sol` with `xhigh`, and every selection was accepted. Tools provide canonical task names, not a separate serving-model attestation; reviewers could not independently verify the runtime selection. No substitute was requested or reported. All ten completed, initially read-only. Earlier reviewers do not count.

| Fresh launch name/ID | Area | Deduplicated result |
| --- | --- | --- |
| `/root/today01_state` | State, ownership, sharing/cache | Reconnect worker could send replacement queue; fixed. |
| `/root/today02_simplicity` | Taste/Ponytail, architecture/noise | Redundant redaction normalization; simplified. Linux resource exclusion accepted. |
| `/root/today03_ux` | UX/accessibility/errors | Sharing Retry did not reload; authentication failure lacked alert semantics. Both fixed. |
| `/root/today04_geometry` | Windows geometry/DPI/work areas | Third-party appbar exposes taskbar-edge ambiguity; unresolved native finding below. |
| `/root/today05_process` | Deadlines, console, descendants | Lookup failure before write, deduplicated with security; Windows descendant limitation retained. |
| `/root/today06_linux` | Linux startup/display/evidence | No additional finding; smoke limits confirmed. |
| `/root/today07_security` | Credentials, HTTP/redaction/privacy | Credential lookup timeout must prevent writes; fixed with dummy coverage. |
| `/root/today08_release` | Packaging/distribution/updater | Independently verified Windows EXE in Linux DEB; excluded and rebuilt. |
| `/root/today09_dependencies` | Advisories/locks/compatibility | No confirmed app regression; artifact integrity and patched resolutions checked. |
| `/root/today10_validation` | Tests/report/native claims | No additional finding; counts/evidence checked and missing trigger tests identified. |

The lead aggregated all ten before editing. Completed refinements:

- Scheduled upload workers now retain their originating connection key through probe enqueue, current-data enqueue and rescheduling. The queue rejects stale workers before reading credentials or changing replacement scheduling. Removed a premature scheduling reset. A deterministic dummy test holds the new send while the old worker wakes and proves exactly one send.
- Sharing Retry reloads persisted choices first. Repeated read failure retains the actionable error and sends nothing. A successful reload restores consent before sync, with stale-result guards retained. Backend authentication failure uses the existing error tone and alert role; Retry and Sign out remain accessible.
- Redaction uses the same 41 canonical keys with one normalization per incoming field, replacing 61 redundant aliases. Separator/case and nested-secret regressions remain.
- macOS plugin credential updates fail before writing on lookup timeout/I/O failure, unsuccessful lookup or unreadable account metadata. Successful updates preserve the full discovered account, including Unicode and an explicitly empty existing account. Removed the unusable service-only write helper. Apple’s CLI requires `-a` before reaching its internal update path, so the proposed lookup-free shortcut was rejected. Dummy runner tests assert zero writes on failures. No real macOS vault operation occurred; existing service-only lookup ambiguity across duplicate items remains. [Apple CLI source](https://github.com/apple-oss-distributions/Security/blob/main/SecurityTool/macOS/keychain_add.c).
- Linux alone overrides the resource array. It removes Windows `sqlite3.exe` at 4,019,200 bytes and its 591-byte provenance file. All 18 plugin manifests and the tray icon remain. The unchanged base glob still includes the Windows helper; DEB still requires `sqlite3`, and AppImage still copies `/usr/bin/sqlite3`. Exact locked Tauri JSON-merge code confirms the Linux array replaces the common array.

Final refinement checks: **200 native tests passed**, two credential-environment tests excluded; **120 focused desktop tests and nine focused web tests passed**; desktop/web TypeScript passed; desktop production build passed at 711.38 KB JS / 208.33 KB gzip. Existing size and Rust visibility/dead-code warnings remain. The new reconnect test initially used mismatched consent and correctly sent nothing; its dummy replacement consent was corrected before the passing run. Read-only final reviews by reviewers 1, 2, 7 and 8 accepted the resulting changes; reviewer 10 accepted the final report and evidence. No broad new dependency upgrade was made. The prior web production build predates the final one-line error-tone refinement; its typecheck and focused rendering tests were rerun.

Rebuilt unsigned DEB: `/home/danyil-liubchak/.cache/eusage-native-build.nyRMCV/tauri-target/release/bundle/deb/eUsage_0.6.29_amd64.deb`, **10,475,628 bytes**, SHA-256 `cf82595d46dcec3697d3dc589d2e5faffded066f718efeabe7405b1b36fc53f7`. Full optimized Tauri build passed with `--locked --offline`, `--ci --no-sign --bundles deb`, a cleared environment and a temporary frontend-path config. Independent archive checks confirmed 73 resources, 18 manifests, no Windows EXE, executable mode 0755, desktop entry, tray icon and all four package dependencies. New executable SHA-256: `0192dd0e178c05febecb7c5ec18b7fd71a1bf707ae20e84acef88dcfe5f2e6f0`. Its loader resolves 122 library entries without missing libraries. Ubuntu 26.04 output still does not establish Ubuntu 22.04 compatibility, signed updates or an installed package pass.

Repeated the bounded Wayland check with the rebuilt extracted package, the existing isolated runner and fresh temporary state containing only the prior dummy settings. The new run again reached frontend `list_plugins: 18` and a probe batch with `[]`. The 15-second observation ended through task-owned termination, 17.002 seconds with tracer cleanup; `-9` is the tracer exit. No task-owned executable/cwd processes remained. GTK scale assertions and the Glycin warning recur, so the earlier desktop/keyring/graceful-Quit limitations still apply. No display, home directory or keyring from the user's session was exposed. New startup evidence is in the review directory below; the original smoke evidence remains intact.

Remaining review findings:

- The transferred geometry change treats any reserved work-area edge as a taskbar edge. Reproduced in pure geometry: monitor `(0,0,1920,1080)`, top appbar work area `(0,48,1920,1032)`, bottom auto-hide icon `(1840,1040,32,32)`, popup 400×500, gap 8. It chooses Top and overlaps the icon by 28 pixels. The previously documented equal-work-area overflow ambiguity also remains. Both need trustworthy monitor-specific taskbar evidence; no speculative platform heuristic was added. Native Windows acceptance and descendant-process checks above remain open.
- Review identified a preexisting prefixed-log gap for nested credential objects and multi-value cookie strings. The authorized local-commit follow-up below closes these cases by omitting messages whose secret boundary cannot be safely determined.
- Enabling zbus/Tokio for Secret Service exposes a compatibility concern in opener’s unused async reveal IPC, which calls blocking zbus. No application caller was found; this is not a demonstrated user-facing regression. Reassess before adding reveal-in-file-manager functionality.

Dependency reviewer 9 independently confirmed all five Seroval consumers resolve 1.6.4, the two serialization regressions pass, 15 changed npm artifact integrities and 18 added Cargo archive hashes match, and production zbus excludes the test-only `p2p` feature. Targeted patched-package advisories returned no findings; deployed SSR and the whole dependency graph remain outside that conclusion.

Review provenance, hashes, scoped patches, reviewer ledger, final refinement patch and validation logs remain local in `/tmp/eusage-review-20261010-xalhdk6n/`. No installs, credentials, user keyrings, preserved-checkout changes, commits, pushes, releases, remote Actions or deployments occurred during this review. AppImage remains blocked by absent, unapproved `patchelf` and `sqlite3`; no third distribution repository is needed.


Local-history handoff, 2026-10-10:

Danyil authorized atomic local commits after the ten-Sol quality stage. The reviewer ledger records all ten completed, with final code/report acceptance; the monitor confirmed completion at 19:46:45 UTC. This follow-up used the installed `/home/danyil-liubchak/.codex/skills/git-style-dl/SKILL.md`, Taste and Ponytail. Latest T3 parent-turn metadata confirmed `gpt-6-astra` / `xhigh`; host `eLink-danyil-linux`, Codex PID 3132096 / parent 3116985, verification child 3244025, same workspace.

Created `dl/fix/desktop-audit-reviewed` once from `f05866fe6c995e253dfea51d1ae5a0f3b49813d6`, the existing audit tip. `dl/fix/desktop-audit` stays at that exact base. No development-branch sync, fetch, reset, history rewrite, duplicate worktree or merge was performed. All other existing local branches, remote refs and tags matched the before snapshot. Commits use the existing Git identity and `--no-gpg-sign`; no signing credentials or configuration were accessed.

Before each commit, the full staged diff and scope were inspected and `git diff --cached --check` passed. Mixed files used explicit index blobs assembled from attributable hunks; working files were not replaced. Dependency patches precede callers; tests accompany their behavior. The Team transaction commit keeps the native owner, IPC protocol and frontend callers together. HTTP error URL suppression is separate from subprocess execution. No generated binaries are committed.

One safe remaining finding was fixed before its commit: prefixed nested credential objects/arrays and multi-value cookies now cause the log message to be omitted. A dummy regression covers those cases and preserves ordinary log messages. The full native suite then passed 201 tests, excluding the same two credential-environment tests. No real credential or keyring was accessed.

| Local commit | Scope |
| --- | --- |
| `bb467df15deb0fac3b6deef0bec82e0869b2cd1f` | fix: pin patched Seroval serialization |
| `d53aad58c617985525c29d575f998259413b1dac` | chore: update Vitest to the patched compatible release |
| `aa48ca2aa2d83aafb1ebe0f195bf881ea3121de2` | fix: reject cross-developer device operations |
| `7b43cb872d9b1a8b03e865493b92d35ba605183d` | fix: validate complete local HTTP requests |
| `f57e658618c3bb6ce06d8637f64c676532bc408e` | fix: redact sensitive provider data |
| `91e35f903349994ef2ed7ce7611cd2fbdc3ed4cb` | fix: bound background subprocess execution |
| `fec338ed323ae06469b1eca089380a7d2421e184` | fix: omit request URLs from provider HTTP errors |
| `99b948f5d4647b72d4301c6f7c6a0dc9613568cd` | fix: complete probe batches within the shared worker limit |
| `23f20e7cc8700e5c8cb933a7ccd4d52fafe517bd` | fix: constrain tray popups to monitor work areas |
| `f4f457d03f854bff7f3bbaddda8904bccb9b47d4` | fix: serialize Team connection ownership changes |
| `72b37a62654c4da6880e2aa7d8d82410c0350f7f` | fix: serialize provider account registry updates |
| `b66c92d321d9adc310307bcf0d1c8b4609944e6b` | fix: isolate workspace queries by authenticated identity |
| `eb18252907d4676b73087cf12b53b9e2bbfdd3d5` | fix: use the installed Clerk appearance types |
| `4319fb0b91ebec56ac563e6840df23cd1b52e072` | feat: store Linux Team credentials in Secret Service |
| `acec62e3688259ccbc382b6bd2e693cee91f5b14` | build: package Linux installers in the existing release workflow |

The final documentation commit contains this report; its exact hash is recorded in the final handoff and local `commits.json` evidence, avoiding a self-referential hash here.

Preserved user edits were verified against `original-state.json` before and after source commits. They remain in `/home/danyil-liubchak/Documents/eusage-mac-preserved`, untouched and outside every commit. The audit checkout's `CONTEXT.md` remains its clean baseline; the other three user documents remain absent here. Nothing was copied back from the preserved checkout.

| Excluded user file | Preserved SHA-256 |
| --- | --- |
| `CONTEXT.md` | `97c7503a5244a4ef87dcd0efff869d6db2568f865b885280811913940dfdc8b2` |
| `docs/architecture-decision-0129-clerk-organizations-for-workspaces.md` | `64f8174205a5bb00b8c46dc3109140f999b8674f28f545405f97157f067e51b0` |
| `docs/grill/hosted-saas-redesign.md` | `bf51ee2bd2f59c1335452cb2cd74403cf0cf5d90280d52ed46f6e9f56746847d` |
| `docs/prd/eusage-saas-developer-token-device-access.md` | `b6336c1846de0f898666cfd1bf694de6c105ec890344b2d9bc25108004d59442` |

Five working files intentionally remain modified:

- `src/App.tsx`: inherited registry-readiness wiring, entirely excluded.
- `src/hooks/app/use-provider-account-settings.ts`: inherited readiness state plus its dependent setter/return hunks.
- `src/hooks/app/use-provider-account-sharing.ts`: inherited wait-before-pruning parameter, guard and dependency.
- `src/hooks/app/use-provider-account-sharing.test.ts`: inherited startup-readiness regression.
- `src/hooks/app/use-provider-account-settings.test.ts`: today's assertions dependent on that excluded flag. The committed tests instead wait for the loaded registry; flag-specific assertions remain local.

The handoff explicitly describes the sharing-startup work as previously unpublished/preserved, so it is not claimed as ours. **The committed tree therefore does not contain that startup-readiness fix.** Merging these commits alone leaves the baseline hazard of pruning saved sharing before registry loading. Keep the working hunks intact; resolve their attribution/authorization before a later merge. They are not disposable leftovers. No merge target or merge action is selected here.

Validation of the proposed committed tree used temporary Vite/TypeScript read overlays for exactly those five files, without another checkout or editing working files. The overlay blobs were verified byte-for-byte against the resulting commits. All other code/configuration blobs match the reviewed working versions. Results:

| Check | Local-commit follow-up result |
| --- | --- |
| Proposed desktop/plugin/Convex tree | 101 files, 1,395 tests passed. The excluded startup-readiness regression is not counted. |
| Web tree | 24 files, 119 tests passed with two workers. Initial concurrent run had three 5-second timeouts; the bounded-worker rerun passed with unchanged assertions and timeouts. |
| Desktop proposed-tree / web TypeScript | Both passed. |
| Desktop proposed-tree production bundle | Passed; 711.26 KB main JS / 208.31 KB gzip. Existing size warning remains. |
| Native Rust after log fix | 201 passed, 2 credential-environment tests filtered; locked/offline full project compilation. |
| Staged scope / final source tree | Full staged review, per-commit whitespace checks, intended-blob comparisons and conflict-marker scan passed. |
| Preserved edits / refs | Four provenance hashes and audit-checkout presence unchanged; original branches, remote refs and tags unchanged. |

These are final-tree checks, not separate full builds of every intermediate commit. The earlier DEB, extracted executable and isolated startup evidence above were produced before the log fix and include the inherited readiness hunks. They are not artifacts of this exact commit tree. No package or native smoke run was repeated during local-history preparation. Web production build evidence is from the completed audit stage; this follow-up reran its tests/typecheck.

Review the local range `dl/fix/desktop-audit..dl/fix/desktop-audit-reviewed`. Source commits and tests are ready for local review, not release acceptance. Outstanding: resolve excluded readiness hunks; Windows taskbar/appbar/overflow edge inference and descendant cleanup; real desktop/keyring checks; AppImage creation after user-approved installation of missing `patchelf`/`sqlite3`; signed updater and Ubuntu 22.04 compatibility checks. No push, merge, publication, remote workflow, package installation or machine/auth/network/security-setting change occurred.

Local preparation evidence: `/tmp/eusage-local-commits-20261010-djobpsg4/`, including per-commit staged patches, exact blob images, exclusion patches, before refs/user hashes, `commits.json`, test/typecheck/build logs and final verification. This directory contains review artifacts, not a duplicate checkout.


Windows release preflight, 2026-10-10:

The latest T3 metadata confirms `gpt-6-astra` / `xhigh`; host `eLink-danyil-linux`, same checkout, branch `dl/fix/desktop-audit-reviewed`, Codex PID 3307924 / parent 3116985. Git Style DL, Taste/Ponytail and Release Tag guidance were read. No new coordinator or reviewers were launched.

The readiness dependency was already resolved by `a77e364deb92154cc8254b88671d3c1be43cc6aa`, attributed to Danyil's `b77b6384f7626264768e6dbe188844bb71ed3c64`. The earlier five-file exclusion and premature-pruning warning describe the previous state; no unstaged dependency remains.

New local fixes:

- `2e8209caff0b660c63d711cdddcc021e7042223d`: keep the existing placement policy, but reject clamped positions that cover the icon plus its gap and try the next edge. A reserved work-area edge can belong to an unrelated appbar. The reproduced top-appbar/bottom-tray case failed at y=568 before this change and passes at y=532. All 11 original geometry tests are preserved in a separate file to keep each file below 400 lines. Two new tests include 216 combinations of edges, inset overflow icons, physical scales, monitor origins and resize sizes. If no candidate has enough room, work-area clamping remains the priority. With an auto-hidden taskbar, the exact taskbar side remains unknowable from these rectangles; placement promises an available adjacent position, not Explorer's actual edge.
- `32a33241439d040e27f2f8a43c3b45549808a824`: each Windows bounded helper gets an unnamed, non-inheritable kill-on-close job. The child starts suspended, joins the job, then resumes; it cannot create descendants before assignment. Stable Rust does not expose its initial thread handle, so the implementation uses the documented Tool Help snapshot and verifies the thread still belongs to this child. Missing/multiple threads or API errors terminate this invocation and return an error. The job closes on errors and success, including a parent exiting with detached descendants. No new dependency, nightly Rust, global job, breakaway flag or system-setting change. All application-owned subprocess creation still passes through `CREATE_NO_WINDOW`; release entry-point console suppression remains in place. [Windows job semantics](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [creation flags](https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags), [Tool Help threads](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/nf-tlhelp32-createtoolhelp32snapshot).
- `2ef4c0f9a59c03577ea158f0b8578dde54fe8fbe`: a small Windows workflow compiles the actual placement, focus and process modules directly with rustc. Its five process regressions cover OS console allocation, captured output, repeated deadlines, output limits, descendant death with inherited/detached pipes, nested jobs and an unrelated helper surviving. Fixtures use a cleared environment, dummy output and task-owned files/processes. It runs on a reviewed-branch push, main push or PR, and is required by the release workflow. Release assets remain draft until all platform build/asset checks succeed; only then are approved changelog notes published and Homebrew/Scoop manifests updated. No workflow has run yet.

Validation completed locally:

| Check | Result |
| --- | --- |
| Placement | 13 tests passed, including the before/after regression and 216-case matrix. |
| Full Linux native library | 203 passed; same two credential-environment tests excluded. |
| Desktop/plugin/Convex | 101 files / 1,396 tests passed. |
| Desktop TypeScript and Vite build | Passed; existing 711.38 kB main-JS chunk warning remains. |
| New Windows job/test source | Rust metadata typecheck on Linux passed. This is not a Windows compile, link or execution result. |
| Workflow | YAML parsed; 14 Bash blocks passed syntax checking; note extraction and mismatched-version rejection passed; Windows gates/draft publication dependencies checked. PowerShell and Windows execution remain pending. |
| Git/source | Full staged diff review, whitespace checks and original-test preservation verified; version remains 0.6.29 pending approval. |

Read-only remote inspection found `origin/main` at `92c0e75d0da7292d5a46a61a01e67f7920b23bfd`, matching the stored remote ref. Local main is its child `b77b6384f7626264768e6dbe188844bb71ed3c64`; retain that unpublished user commit. The reviewed remote branch and v0.6.30 tag are absent. Public API metadata is readable; local gh authentication is absent and was not configured. A no-checkout merge-tree preview finds three readiness-file conflicts. The reviewed versions already retain the original fix and its tests; every other previewed file matches the reviewed tree. After approval, resolve only those conflicts to the reviewed versions and require the merged tree to match the approved branch tree. No branch merge was performed.

Proposed release is 0.6.30. Version/changelog edits, branch pushes, the merge, tag and publication await explicit approval. Prepare the version/changelog commit on the reviewed branch; push that branch first and require its exact Windows-check run to pass before merging main. Recheck remote main before pushing. The release workflow must complete its Windows gate, all platform builds and asset checks before publishing the draft and updating distribution manifests. A failure stops the sequence; do not treat a successful Linux unit test as a Windows result. Hosted web/Convex deployment is outside this desktop release.

Remaining observation limits: actual Windows helper/job behavior still awaits Windows execution. Interactive taskbar/overflow positioning, mixed-DPI monitor transitions, provider-specific child windows and visual console flashing need a disposable Windows desktop without real provider credentials. Open/resize/close the popup from each available taskbar edge and overflow tray, move between monitors, use 100/125/150/200% scaling, and repeat dummy refreshes while watching for console windows. CI's console-allocation check complements that visual check; it does not replace it. Suspended-process integration can fail closed if external software injects extra threads. Ordinary CreateProcess descendants are covered by job semantics; externally brokered work is outside this owner.

Live Linux GUI/tray/keyring checks and signed-updater acceptance remain unverified. Local AppImage production still lacks patchelf/sqlite3; no installation was attempted. The existing Ubuntu release job provides those tools on its runner, but its first build and package validation remain pending. Four excluded user documents and original/preserved checkouts remain untouched. No credential access, auth/network/security setting change, push, tag, merge, publication or remote workflow occurred in this preflight.

Evidence and the approval proposal: `/tmp/eusage-windows-preflight-20261010-u8g29fbl/`. This contains logs and review artifacts, not another checkout. The previous audit and readiness evidence remain intact.


Safe local release preparation, 2026-10-10 local / 2026-10-11 UTC:

T3 again confirms `gpt-6-astra` / `xhigh`. Host `eLink-danyil-linux`, same workspace and reviewed branch; Codex PID 3379426, parent 3116985. Start tip `9d8bf20` was clean. All four preserved user-document SHA-256 values and their current-checkout presence matched the prior provenance record. The ten-reviewer stage and readiness integration remain complete; no new owner or checkout was created.

Read-only remote checks still find main at `92c0e75d0da7292d5a46a61a01e67f7920b23bfd`, no reviewed remote branch and no `v0.6.30` tag. GitHub's public API returns `v0.6.29` as latest and 404 for the proposed release. Public metadata does not expose private drafts. No gh login or credential configuration was attempted.

Local changes:

- `566a9853d40b400876ca743c3f147ad9be8f7c0a`: check all macOS ARM/Intel, Windows NSIS/MSI and Linux DEB/AppImage assets after the complete matrix. Each expected updater entry, compatibility alias, current-tag URL, nonempty signature and uploaded asset is required. This replaces the check that accepted any `.sig`, which could belong to another platform. Four dummy-fixture tests cover every missing/empty asset or entry, wrong versions, stale URLs and architecture/repository mismatches. Bun uses its frozen lockfile; every Cargo release build uses `--locked`. The checker proves metadata completeness, not cryptographic validity or installation. Names match the prior public release, produced Linux DEB and [Tauri action's manifest implementation](https://github.com/tauri-apps/tauri-action/blob/v0/src/upload-version-json.ts).
- `af15b14ad96d69872e0ca6884a01088ecee09aa1`: prepare 0.6.30 in package.json, both Tauri manifests and the root Cargo lock record. Offline `cargo update -p eusage` changed no dependency record. CHANGELOG retains older releases and credits the source commits, including the readiness fix preserved on local main.
- `77fdacda818b365464c7f5d908188f8cc71b19b1`: fix existing Claude/Codex test fixtures that constructed local dates while their reporting zone was UTC. The first full 0.6.30 test run had 1,388 passes and eight such failures after midnight UTC while New York was still October 10. No production plugin code, exposed fields or assertions changed. Both UTC and New York focused runs then passed all 167 tests.

Validation on the committed version tree compiled the full Linux native library with locked/offline dependencies: 203 passed, with the same two credential-environment tests excluded. The private Secret Service dummy fixtures passed, including locked/unavailable storage. Desktop TypeScript and the production frontend build passed. The initial bundle was 718.81 kB / 210.52 kB gzip, retaining the existing chunk-size warning. Workflow YAML, all four locked targets, draft/build/check dependencies and 14 Bash blocks passed local checks. Final committed-tree rerun results, source identities and exact tip are recorded in the evidence directory below. These checks do not use .env files, real credentials or source overlays.

Publication scope needs one correction. GitHub reports a successful Vercel deployment for remote main and prior Production/Preview deployments. `vercel.json` invokes `convex deploy`. A future branch/main push may therefore trigger hosted deployment outside the desktop workflow. Its active trigger policy was not verified from service settings. Do not describe a push as desktop-only, change that policy, or infer hosted-deployment approval. The changelog now distinguishes the workflow from separate Git integration effects.

Outstanding gates and required actions:

- Windows: execute the committed helper/geometry workflow on Windows, then use a disposable Windows desktop for taskbar/overflow, auto-hide, multi-monitor/DPI transitions, focus/resize and visual console checks. Tests use dummy processes; provider-specific windows and brokered descendants need separate observation. No native Windows run occurred here.
- Linux: a user must provide a disposable desktop account/session and test keyring for tray/UI, prompts, cancellation and credential lifecycle with dummy data. Private-bus fixtures do not validate a real Secret Service provider's encrypted transport. Do not connect these tests to the user's real keyring.
- AppImage: `command -v` and dpkg still find neither `patchelf` nor `sqlite3`. User-only installation, separately approved, would be `sudo apt-get install --no-install-recommends patchelf sqlite3` from existing official repositories after reviewing its package preview. No install was attempted. All six previously approved development packages remain installed.
- Compatibility and updates: build/run packages on Ubuntu 22.04; verify macOS and Windows installers and an update from 0.6.29 using the existing signing setup. Signature file presence is not cryptographic acceptance. No signing key was accessed, no package was installed, and no 0.6.30 native package was produced in this preparation.

Future sequence, not authorized or executed: first settle the Vercel/Convex push effects and remaining acceptance gates. Then approve creating `origin/dl/fix/desktop-audit-reviewed` at the reviewed tip and its Windows checks. Before any later merge/push, recheck remote main and tag availability. Preserve unpublished local main `b77b638`, use the agreed no-ff merge, resolve the three readiness conflicts to the reviewed versions, and require the merged tree to equal the approved tree. Updating `origin/main` and creating/pushing annotated `v0.6.30` requires separate explicit approval. The tag workflow automatically builds four platform targets, signs updater artifacts using existing CI secret references, publishes the checked draft, and writes Homebrew/Scoop manifests to their repositories. It has no human acceptance pause after upload; a tag push is not merely permission for a draft build. Do not trigger it while release gates remain unresolved. No third Linux repository or hosted deployment is part of the desktop workflow itself.

Evidence: `/tmp/eusage-release-preparation-20261010-h7r3fg2t/`. It contains staged patches, runtime/ref/hash snapshots, public remote metadata, fixture logs, final committed-tree logs and the local handoff. No push, merge, tag, release, remote action, install, credential access or machine/security/auth/network-setting change occurred.
