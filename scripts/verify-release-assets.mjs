import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Check the completed matrix before publishing. Signature presence is not
// cryptographic verification or a substitute for an installed-app update test.
export function verifyReleaseAssets(release, manifest, tag, repository) {
  assert.match(tag, /^v\d+\.\d+\.\d+$/);
  assert.match(repository, /^[\w.-]+\/[\w.-]+$/);
  const version = tag.slice(1);
  assert.equal(manifest.version, version, "Updater version must match the tag");
  const assets = new Map(release.assets.map((asset) => [asset.name, asset.size]));
  const requireAsset = (name) => {
    assert(assets.get(name) > 0, `Missing or empty release asset: ${name}`);
  };
  const installers = {
    "darwin-aarch64-app": "eUsage_aarch64.app.tar.gz",
    "darwin-x86_64-app": "eUsage_x64.app.tar.gz",
    "windows-x86_64-nsis": `eUsage_${version}_x64-setup.exe`,
    "windows-x86_64-msi": `eUsage_${version}_x64_en-US.msi`,
    "linux-x86_64-deb": `eUsage_${version}_amd64.deb`,
    "linux-x86_64-appimage": `eUsage_${version}_amd64.AppImage`,
  };
  const requireEntry = (platform, names) => {
    const entry = manifest.platforms?.[platform];
    assert(entry, `Missing updater platform: ${platform}`);
    assert(
      typeof entry.signature === "string" && entry.signature.trim(),
      `Missing updater signature: ${platform}`,
    );
    assert(
      names.some((name) => entry.url === `https://github.com/${repository}/releases/download/${tag}/${name}`),
      `Wrong updater URL: ${platform}`,
    );
  };
  requireAsset("latest.json");
  requireAsset(`eUsage_${version}_aarch64.dmg`);
  requireAsset(`eUsage_${version}_x64.dmg`);
  for (const [platform, name] of Object.entries(installers)) {
    requireAsset(name);
    requireAsset(`${name}.sig`);
    requireEntry(platform, [name]);
  }
  // Keep aliases used by older installed clients as well as installer entries.
  for (const platform of ["darwin-aarch64", "darwin-x86_64", "windows-x86_64", "linux-x86_64"]) {
    const names = Object.entries(installers)
      .filter(([key]) => key.startsWith(`${platform}-`))
      .map(([, name]) => name);
    requireEntry(platform, names);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [releaseFile, manifestFile, tag, repository] = process.argv.slice(2);
  verifyReleaseAssets(
    JSON.parse(readFileSync(releaseFile, "utf8")),
    JSON.parse(readFileSync(manifestFile, "utf8")),
    tag,
    repository,
  );
  console.log(`Release assets and updater entries complete for ${tag}`);
}
