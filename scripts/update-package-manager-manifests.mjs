import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const releaseTag = requiredEnv("RELEASE_TAG");
if (!/^v\d+\.\d+\.\d+$/.test(releaseTag)) {
  throw new Error(`RELEASE_TAG must be vMAJOR.MINOR.PATCH, got ${releaseTag}`);
}

const version = releaseTag.slice(1);
const assetDir = process.env.RELEASE_ASSET_DIR ?? "release-assets";
const homebrewRepoPath =
  process.env.HOMEBREW_REPO_PATH ?? "package-repos/homebrew-eusage";
const scoopRepoPath = process.env.SCOOP_REPO_PATH ?? "package-repos/scoop-eusage";

const assets = {
  macArm: `eUsage_${version}_aarch64.dmg`,
  macIntel: `eUsage_${version}_x64.dmg`,
  windowsX64: `eUsage_${version}_x64-setup.exe`,
};

const hashes = {
  macArm: sha256File(path.join(assetDir, assets.macArm)),
  macIntel: sha256File(path.join(assetDir, assets.macIntel)),
  windowsX64: sha256File(path.join(assetDir, assets.windowsX64)),
};

writeFileSync(
  path.join(homebrewRepoPath, "Casks/eusage.rb"),
  homebrewCask({ version, hashes }),
);
writeFileSync(
  path.join(scoopRepoPath, "bucket/eusage.json"),
  `${JSON.stringify(scoopManifest({ version, hash: hashes.windowsX64 }), null, 2)}\n`,
);

console.log(`Updated package manager manifests for ${releaseTag}`);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sha256File(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing release asset: ${filePath}`);
  }

  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function homebrewCask({ version, hashes }) {
  return `cask "eusage" do
  arch arm: "aarch64", intel: "x64"

  version "${version}"
  sha256 arm:   "${hashes.macArm}",
         intel: "${hashes.macIntel}"

  url "https://github.com/DanyilLiubchakUk/eusage/releases/download/v#{version}/eUsage_#{version}_#{arch}.dmg"
  name "eUsage"
  desc "Internal team AI usage tracker"
  homepage "https://github.com/DanyilLiubchakUk/eusage"

  depends_on macos: :ventura

  app "eUsage.app"

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/eUsage.app"],
                   sudo: false
  end

  zap trash: [
    "~/Library/Application Support/app.eusage.desktop",
    "~/Library/Logs/app.eusage.desktop",
    "~/Library/Preferences/app.eusage.desktop.plist",
    "~/Library/Saved Application State/app.eusage.desktop.savedState",
  ]
end
`;
}

function scoopManifest({ version, hash }) {
  return {
    version,
    description: "Internal team AI usage tracker",
    homepage: "https://github.com/DanyilLiubchakUk/eusage",
    license: "MIT",
    architecture: {
      "64bit": {
        url: `https://github.com/DanyilLiubchakUk/eusage/releases/download/v${version}/eUsage_${version}_x64-setup.exe`,
        hash,
      },
    },
    pre_install: [
      `$installer = Get-ChildItem $cachedir -Filter 'eusage#${version}#*.exe' | Select-Object -First 1`,
      "if ($installer) { Unblock-File -Path $installer.FullName -ErrorAction SilentlyContinue }",
    ],
    installer: {
      args: ["/S"],
    },
    uninstaller: {
      args: ["/S"],
    },
    checkver: {
      github: "https://github.com/DanyilLiubchakUk/eusage",
    },
    autoupdate: {
      architecture: {
        "64bit": {
          url: "https://github.com/DanyilLiubchakUk/eusage/releases/download/v$version/eUsage_$version_x64-setup.exe",
        },
      },
    },
  };
}
