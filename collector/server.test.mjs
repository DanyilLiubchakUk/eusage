import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createCollector } from "./server.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function withServer(fn) {
  const dir = await mkdtemp(join(tmpdir(), "usageboard-collector-"));
  const server = createCollector({
    dataFile: join(dir, "store.json"),
    adminToken: "admin-secret",
  });
  const baseUrl = await listen(server);
  try {
    await fn(baseUrl);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function createsOrgIngestsAndReads() {
  await withServer(async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/v1/orgs`, {
      method: "POST",
      headers: {
        authorization: "Bearer admin-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Acme Team" }),
    });
    assert.equal(createRes.status, 201);
    const org = await createRes.json();
    assert.equal(org.orgId, "acme-team");
    assert.match(org.writeToken, /^ub_write_/);
    assert.match(org.readToken, /^ub_read_/);

    const ingestRes = await fetch(`${baseUrl}/v1/usage`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${org.writeToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        orgId: org.orgId,
        teammateId: "danyil",
        teammateName: "Danyil",
        snapshot: {
          providerId: "codex",
          displayName: "Codex",
          plan: "Pro",
          lines: [{ type: "progress", label: "Session", used: 25, limit: 100 }],
          fetchedAt: "2026-05-26T12:00:00Z",
        },
      }),
    });
    assert.equal(ingestRes.status, 202);

    const readRes = await fetch(`${baseUrl}/v1/orgs/${org.orgId}/usage`, {
      headers: { authorization: `Bearer ${org.readToken}` },
    });
    assert.equal(readRes.status, 200);
    const data = await readRes.json();
    assert.equal(data.name, "Acme Team");
    assert.equal(data.teammates[0].teammateName, "Danyil");
    assert.equal(data.teammates[0].snapshots.codex.displayName, "Codex");
  });
}

async function rejectsWritesWithoutToken() {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/usage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: "acme",
        teammateId: "danyil",
        teammateName: "Danyil",
        snapshot: { providerId: "codex", displayName: "Codex", lines: [] },
      }),
    });
    assert.equal(res.status, 401);
  });
}

await createsOrgIngestsAndReads();
await rejectsWritesWithoutToken();
console.log("collector smoke tests passed");
