# Desktop release deployment

## Goal

Ship macOS, Windows and Linux desktop builds for a small internal team, using the existing `Restart to update` button.

## Current updater path

eUsage already uses the Tauri v2 updater.

- `src-tauri/tauri.conf.json` enables `createUpdaterArtifacts`.
- The updater endpoint is `https://github.com/dliubchak/eusage/releases/latest/download/latest.json`.
- The app checks for updates on launch and every 15 minutes.
- When an update is downloaded, the footer shows `Restart to update`.
- Clicking it installs the downloaded updater artifact and relaunches the app.

The free update host is GitHub Releases. No paid update server is needed.

## Free release path

Before a release, the reviewed branch runs `.github/workflows/desktop-builds.yml`: native tests and package builds on macOS ARM/Intel, Windows x64 and Ubuntu 22.04 x64. It retains installers as CI artifacts without updater signing or publication. Linux checks require both DEB and AppImage, resolve executable libraries, run bundled SQLite against an in-memory fixture and reject the Windows SQLite binary. Native GUI and signed-update acceptance remain separate checks.

1. Bump the app version in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json`.
2. Commit the version bump and changelog.
3. Push a tag named `vMAJOR.MINOR.PATCH`.
4. GitHub Actions runs `.github/workflows/publish.yml`.
5. After Windows helper and popup tests pass, the workflow builds from locked dependencies:
   - macOS Apple Silicon DMG.
   - macOS Intel DMG.
   - Windows x64 installer.
   - Linux x64 DEB and AppImage on Ubuntu 22.04.
6. The workflow uploads installers, updater signatures and `latest.json` to a draft release. After all builds finish, it checks every expected installer, signature and updater entry before publishing the changelog and release.
7. After publication, the workflow updates the Homebrew cask and Scoop manifest with release URLs and hashes.
8. Existing desktop apps see the new `latest.json`, download the matching artifact, then show `Restart to update`.

GitHub Actions and GitHub Releases are enough for this path.

Asset checks verify presence, version and URLs. They do not verify signatures cryptographically or test installation. Native desktop, package and signed-update acceptance remain separate release gates. A failed build or asset check keeps the release draft.

Before pushing, also check hosted deployment triggers. This repository has Vercel deployment history, and `vercel.json` runs `convex deploy`. A branch or main push may deploy web/Convex through that separate integration even though the desktop workflow does not. Desktop publication approval alone must not imply approval for an unreviewed hosted deployment.

Linux uses the same GitHub Release, with no third distribution repository. The DEB requires system `sqlite3`; the AppImage bundles it. Linux ARM64 is not built. Homebrew and Scoop manifest generation remains macOS and Windows only.

For first-install package-manager setup, see [Desktop package managers](desktop-package-managers.md).

For one-time GitHub repo and secret setup, see [GitHub release setup](github-release-setup.md).

## Windows install

Windows v1 uses an unsigned x64 installer. This is free.

Expected user experience:

- User downloads the `.exe` installer from GitHub Releases.
- Windows may show SmartScreen or unknown-publisher warnings.
- User can still install by choosing the extra confirmation path.
- After first install, future updates use the in-app updater button.

This matches Decision 0048.

For technical users, a private Scoop bucket gives a repeatable free install command. It does not remove SmartScreen warnings for unsigned installers.

Paid path later:

- Buy a Windows code-signing certificate.
- Add Windows signing secrets to GitHub Actions.
- Keep the same installer and updater flow.

## macOS install

Fully smooth macOS install is not free. Apple requires Developer ID signing and notarization for normal outside-App-Store distribution.

Free internal path:

- Build and publish unsigned or ad-hoc signed DMGs.
- Users install with a private Homebrew cask and `--no-quarantine`, or manually bypass Gatekeeper.
- This can work for a tiny dev team, but it is not a clean teammate-ready path.

Teammate-ready path:

- Use a paid Apple Developer account.
- Add Apple signing and notarization back to the publish workflow.
- Then add these GitHub secrets:
  - `APPLE_CERTIFICATE`
  - `APPLE_CERTIFICATE_PASSWORD`
  - `KEYCHAIN_PASSWORD`
  - `APPLE_SIGNING_IDENTITY`
  - `APPLE_ID`
  - `APPLE_PASSWORD`
  - `APPLE_TEAM_ID`
- Keep `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` for updater signatures.
- Push a release tag.
- GitHub Actions signs, notarizes, publishes DMGs, and uploads updater metadata.
- The current free workflow intentionally does not read Apple secrets.

## Required secrets

Updater signatures are still required because the app verifies downloaded updates before install.

Required for the release workflow:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `PACKAGE_REPOS_TOKEN` for writing package-manager manifest updates.

Required only for smooth macOS distribution:

- Apple Developer signing and notarization secrets listed above.
- A workflow update that passes those secrets to Tauri.

## What the button does

Do not change the button into a custom downloader.

Best free long-run behavior:

- Keep Tauri updater for installed apps.
- Keep GitHub Releases as the update feed.
- Keep `Restart to update` as install + relaunch.

Changing the button to open a browser download would be worse for repeat deploys. It would make every update a manual reinstall.

## Readiness checklist

- GitHub Release has macOS Apple Silicon, macOS Intel, Windows x64, and Linux x64 DEB/AppImage assets.
- GitHub Release has `latest.json`.
- GitHub Release has updater `.sig` files.
- Fresh Windows install works through unsigned-installer warning.
- Fresh macOS install works through the chosen path: manual bypass for free internal use, notarized DMG for teammate-ready use.
- Linux packages start on Ubuntu 22.04 and a supported desktop. Tray behavior, locked/unavailable keyring errors and dummy credential lifecycle pass in an isolated user session.
- Old installed app sees update and shows `Restart to update`.
- Button installs update and relaunches.
- Admin and TV still show real synced data after updated desktop reconnects.
