import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyReleaseAssets } from "./verify-release-assets.mjs";

const tag = "v0.6.30";
const repository = "fixture/eusage";
const names = {
  "darwin-aarch64-app": "eUsage_aarch64.app.tar.gz",
  "darwin-x86_64-app": "eUsage_x64.app.tar.gz",
  "windows-x86_64-nsis": "eUsage_0.6.30_x64-setup.exe",
  "windows-x86_64-msi": "eUsage_0.6.30_x64_en-US.msi",
  "linux-x86_64-deb": "eUsage_0.6.30_amd64.deb",
  "linux-x86_64-appimage": "eUsage_0.6.30_amd64.AppImage",
};

function fixture() {
  const assets = ["latest.json", "eUsage_0.6.30_aarch64.dmg", "eUsage_0.6.30_x64.dmg"];
  const platforms = {};
  const signatures = {};
  for (const [platform, name] of Object.entries(names)) {
    assets.push(name, `${name}.sig`);
    platforms[platform] = {
      url: `https://github.com/${repository}/releases/download/${tag}/${name}`,
      signature: `dummy signature for ${name}`,
    };
    signatures[`${name}.sig`] = platforms[platform].signature;
    platforms[platform.split("-").slice(0, 2).join("-")] = { ...platforms[platform] };
  }
  return {
    release: { assets: assets.map((name) => ({ name, size: 123 })) },
    manifest: { version: "0.6.30", platforms },
    signatures,
  };
}

const verify = ({ release, manifest, signatures }) => verifyReleaseAssets(release, manifest, tag, repository, signatures);

test("accepts the complete macOS, Windows and Linux matrix", () => {
  verify(fixture());
});

test("rejects each missing or empty installer, signature and manifest", () => {
  for (const { name } of fixture().release.assets) {
    const missing = fixture();
    missing.release.assets = missing.release.assets.filter((asset) => asset.name !== name);
    assert.throws(() => verify(missing), /Missing or empty release asset/);
    const empty = fixture();
    empty.release.assets.find((asset) => asset.name === name).size = 0;
    assert.throws(() => verify(empty), /Missing or empty release asset/);
  }
});

test("rejects each missing platform, blank signature or stale URL including aliases", () => {
  for (const platform of Object.keys(fixture().manifest.platforms)) {
    const missing = fixture();
    delete missing.manifest.platforms[platform];
    assert.throws(() => verify(missing), /Missing updater platform/);
    const blank = fixture();
    blank.manifest.platforms[platform].signature = "  ";
    assert.throws(() => verify(blank), /Missing updater signature/);
    const mismatched = fixture();
    mismatched.manifest.platforms[platform].signature = "another artifact's signature";
    assert.throws(() => verify(mismatched), /signature does not match uploaded asset/);
    const missingSignature = fixture();
    const name = missingSignature.manifest.platforms[platform].url.split("/").at(-1);
    delete missingSignature.signatures[`${name}.sig`];
    assert.throws(() => verify(missingSignature), /signature does not match uploaded asset/);
    const stale = fixture();
    stale.manifest.platforms[platform].url = stale.manifest.platforms[platform].url.replace(tag, "v0.6.29");
    assert.throws(() => verify(stale), /Wrong updater URL/);
  }
});

test("rejects a wrong version, repository or architecture", () => {
  const wrongVersion = fixture();
  wrongVersion.manifest.version = "0.6.29";
  assert.throws(() => verify(wrongVersion), /Updater version/);
  const wrongRepo = fixture();
  wrongRepo.manifest.platforms["linux-x86_64-deb"].url = wrongRepo.manifest.platforms["linux-x86_64-deb"].url.replace(repository, "other/repo");
  assert.throws(() => verify(wrongRepo), /Wrong updater URL/);
  const wrongArch = fixture();
  wrongArch.manifest.platforms["darwin-aarch64-app"].url = wrongArch.manifest.platforms["darwin-x86_64-app"].url;
  assert.throws(() => verify(wrongArch), /Wrong updater URL/);
});
