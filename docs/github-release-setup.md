# GitHub release setup

## Goal

Set up the three GitHub repos so one release tag in `eusage` builds desktop
installers, updates the Tauri updater feed, and updates Homebrew/Scoop manifests.

Normal code pushes do not deploy desktop builds. Desktop deploy starts when you
push a version tag like `v0.6.25`.

## Repos

You need these repos:

- `DanyilLiubchakUk/eusage`
- `DanyilLiubchakUk/homebrew-eusage`
- `DanyilLiubchakUk/scoop-eusage`

All three should have:

- Default branch: `main`.
- GitHub Actions enabled where available.
- You as admin or maintainer.

## eUsage repo setup

In `DanyilLiubchakUk/eusage`:

1. Push current `main`.
2. Open GitHub repo settings.
3. Go to `Actions` -> `General`.
4. Allow actions to run.
5. Set workflow permissions to allow read/write if the repo setting asks.
6. Add repository secrets under `Settings` -> `Secrets and variables` -> `Actions`.

Required secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `PACKAGE_REPOS_TOKEN`

`PACKAGE_REPOS_TOKEN` must be a GitHub token that can write to:

- `DanyilLiubchakUk/homebrew-eusage`
- `DanyilLiubchakUk/scoop-eusage`

Use a fine-grained personal access token if possible:

- Repository access: only `homebrew-eusage` and `scoop-eusage`.
- Permission: `Contents` read/write.
- Permission: `Metadata` read.

Do not use the default `GITHUB_TOKEN` for package repos. It belongs to the
`eusage` workflow run and cannot push to the other repos unless you add a
separate cross-repo token.

## Homebrew repo setup

In `DanyilLiubchakUk/homebrew-eusage`:

1. Push current `main`.
2. Confirm this file exists:

```text
Casks/eusage.rb
```

3. Confirm the repo URL used by users is:

```bash
brew tap DanyilLiubchakUk/eusage
```

No secrets are needed in this repo.

The `eusage` release workflow updates `Casks/eusage.rb` automatically after each
release. Manual edits are only for recovery.

## Scoop repo setup

In `DanyilLiubchakUk/scoop-eusage`:

1. Push current `main`.
2. Confirm this file exists:

```text
bucket/eusage.json
```

3. Confirm the bucket URL used by users is:

```powershell
scoop bucket add eusage https://github.com/DanyilLiubchakUk/scoop-eusage
```

No secrets are needed in this repo.

The `eusage` release workflow updates `bucket/eusage.json` automatically after
each release. Manual edits are only for recovery.

## Release flow

Before tagging a release:

1. Make sure `main` is pushed in all three repos.
2. Make sure the `eusage` repo has all required secrets.
3. Bump the version in:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
4. Commit the version bump.
5. Tag the same version.

Example:

```bash
git tag v0.6.25
git push origin main
git push origin v0.6.25
```

The tag starts `.github/workflows/publish.yml`.

## What the workflow should do

The `Publish` workflow should:

1. Build macOS Apple Silicon DMG.
2. Build macOS Intel DMG.
3. Build Windows x64 installer.
4. Upload GitHub Release assets.
5. Upload `latest.json`.
6. Upload updater `.sig` files.
7. Download the final release installers.
8. Compute SHA256 hashes.
9. Commit updated `Casks/eusage.rb` to `homebrew-eusage`.
10. Commit updated `bucket/eusage.json` to `scoop-eusage`.

## What to verify after release

In GitHub Release:

- `eUsage_VERSION_aarch64.dmg`
- `eUsage_VERSION_x64.dmg`
- `eUsage_VERSION_x64-setup.exe`
- `latest.json`
- updater `.sig` files

In `homebrew-eusage`:

- latest commit says `chore: update eusage to vVERSION`.
- `Casks/eusage.rb` has the new version and hashes.

In `scoop-eusage`:

- latest commit says `chore: update eusage to vVERSION`.
- `bucket/eusage.json` has the new version and hash.

On installed apps:

- Open old eUsage.
- Wait for update check.
- Confirm footer shows `Restart to update`.
- Click it.
- Confirm app relaunches on the new version.

## If package-manager update fails

Do not rebuild the release just for this.

1. Open the failed `update-package-managers` job.
2. Fix missing token/permission/asset-name issue.
3. Rerun the failed job if GitHub allows it.
4. If rerun is not enough, update package repos manually from the release asset
   hashes.

The app updater still works if only Homebrew/Scoop manifest updates fail.
