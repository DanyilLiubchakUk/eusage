import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const check = fileURLToPath(new URL("./check-linux-bundles.sh", import.meta.url));

test("Linux package check rejects missing runtime resources and mismatched versions", () => {
  const root = mkdtempSync(path.join(tmpdir(), "eusage-package-check-"));
  try {
    for (const dir of ["deb", "appimage", "fixture/DEBIAN", "fixture/usr/bin"]) {
      mkdirSync(path.join(root, dir), { recursive: true });
    }
    writeFileSync(path.join(root, "fixture/DEBIAN/control"),
      "Package: eusage-fixture\nVersion: 0.6.30\nArchitecture: amd64\nMaintainer: Test\nDescription: Dummy package\nDepends: sqlite3\n");
    cpSync("/usr/bin/true", path.join(root, "fixture/usr/bin/eusage"));
    execFileSync("dpkg-deb", ["--build", path.join(root, "fixture"), path.join(root, "deb/eUsage_0.6.30_amd64.deb")]);
    // Fake extraction only. Actual AppImage production is tested on the CI runner.
    const appimage = path.join(root, "appimage/eUsage_0.6.30_amd64.AppImage");
    const extraction = "#!/bin/sh\nset -e\nmkdir -p squashfs-root/usr/bin\ncp /usr/bin/true squashfs-root/usr/bin/eusage\n";
    const sqlite = "printf '#!/bin/sh\\nprintf 42\\n' > squashfs-root/usr/bin/sqlite3\nchmod +x squashfs-root/usr/bin/sqlite3\n";
    const run = (name, version = "0.6.30") => spawnSync("bash", [check, root, version, path.join(root, name)], { encoding: "utf8" });

    writeFileSync(appimage, extraction + sqlite, { mode: 0o755 });
    assert.equal(run("valid").status, 0);
    cpSync(path.join(root, "deb/eUsage_0.6.30_amd64.deb"), path.join(root, "deb/eUsage_0.6.31_amd64.deb"));
    cpSync(appimage, path.join(root, "appimage/eUsage_0.6.31_amd64.AppImage"));
    const wrongVersion = run("wrong-version", "0.6.31");
    assert.notEqual(wrongVersion.status, 0);
    assert.match(wrongVersion.stdout, /DEB version does not match/);
    writeFileSync(appimage, extraction);
    assert.notEqual(run("missing-sqlite").status, 0);
    writeFileSync(appimage, extraction + sqlite + "touch squashfs-root/usr/bin/sqlite3.exe\n");
    const windowsResource = run("windows-resource");
    assert.notEqual(windowsResource.status, 0);
    assert.match(windowsResource.stdout, /Windows SQLite unexpectedly packaged/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
