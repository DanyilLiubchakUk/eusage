# Desktop package managers

## Goal

Use free package managers for first install, then keep the existing GitHub Release auto-update path for repeat updates.

This is for a small technical team. It is not the public-user distribution path.

## How updates work

Package managers install eUsage the first time.

After install, eUsage updates itself through the Tauri updater:

- The app checks `https://github.com/DanyilLiubchakUk/eusage/releases/latest/download/latest.json`.
- GitHub Releases hosts `latest.json`, updater artifacts, and signatures.
- The footer shows `Restart to update` when a new version is downloaded.
- Clicking `Restart to update` installs the downloaded update and relaunches.

Do not replace this with package-manager upgrades for normal users. `brew upgrade` and `scoop update` are useful recovery paths, but the in-app updater is the smoother repeat-deploy path.

## Agent release prep

When preparing a release:

1. Bump the version in:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
2. Commit the version bump and changelog.
3. Push tag `vMAJOR.MINOR.PATCH`.
4. Wait for `.github/workflows/publish.yml`.
5. Confirm GitHub Release has:
   - macOS Apple Silicon DMG.
   - macOS Intel DMG.
   - Windows x64 installer.
   - `latest.json`.
   - updater `.sig` files.
6. Confirm the workflow pushed package-manager manifest updates to:
   - `DanyilLiubchakUk/homebrew-eusage`.
   - `DanyilLiubchakUk/scoop-eusage`.

The publish workflow computes hashes from the final release assets and commits the
updated Homebrew cask and Scoop manifest automatically.

Manual fallback, only if the package-manager job fails:

```bash
shasum -a 256 path/to/eUsage.dmg
shasum -a 256 path/to/eUsage-setup.exe
```

## User setup: macOS with Homebrew

Create a private or public tap repo, for example:

```text
github.com/DanyilLiubchakUk/homebrew-eusage
```

Inside that repo, add:

```text
Casks/eusage.rb
```

Use [release-templates/homebrew-cask-eusage.rb](release-templates/homebrew-cask-eusage.rb) as the starting point.

Install:

```bash
brew tap DanyilLiubchakUk/eusage
brew install --cask eusage --no-quarantine
```

`--no-quarantine` is the cleanest tech-team workaround for unsigned or unnotarized macOS builds.

If you choose to remove quarantine inside the cask itself, keep that only in the private tap. Do not expect official Homebrew Cask to accept that for unsigned software.

Upgrade or reinstall through Homebrew if needed:

```bash
brew update
brew upgrade --cask eusage --no-quarantine
```

Normal updates should still happen inside eUsage through `Restart to update`.

## User setup: Windows with Scoop

Create a bucket repo, for example:

```text
github.com/DanyilLiubchakUk/scoop-eusage
```

Inside that repo, add:

```text
bucket/eusage.json
```

Use [release-templates/scoop-eusage.json](release-templates/scoop-eusage.json) as the starting point.

Install:

```powershell
scoop bucket add eusage https://github.com/DanyilLiubchakUk/scoop-eusage
scoop install eusage
```

Windows caveat:

- Scoop makes install repeatable for technical users.
- It does not remove SmartScreen warnings for unsigned installers.
- The first install may still show an unknown-publisher warning.
- After first install, normal updates should happen inside eUsage through `Restart to update`.

Upgrade or reinstall through Scoop if needed:

```powershell
scoop update
scoop update eusage
```

## What you set up once

- GitHub Release publishing in this repo.
- Homebrew tap repo with `Casks/eusage.rb`.
- Scoop bucket repo with `bucket/eusage.json`.
- `PACKAGE_REPOS_TOKEN` GitHub secret in `DanyilLiubchakUk/eusage`.
  - Needs write access to `DanyilLiubchakUk/homebrew-eusage`.
  - Needs write access to `DanyilLiubchakUk/scoop-eusage`.
- Tauri updater signing secrets:
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Optional paid macOS smooth path:

- Apple Developer account.
- Apple signing and notarization secrets in GitHub Actions.

## What devs do

macOS:

```bash
brew tap DanyilLiubchakUk/eusage
brew install --cask eusage --no-quarantine
```

Windows:

```powershell
scoop bucket add eusage https://github.com/DanyilLiubchakUk/scoop-eusage
scoop install eusage
```

After install:

1. Open eUsage.
2. Paste the team connection string.
3. Wait for provider sync.
4. Use `Restart to update` when the app offers it.
