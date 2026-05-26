import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";

const DEFAULT_PORT = 8787;
const DEFAULT_DATA_FILE = resolve("collector/data/usageboard.json");
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

function token(prefix) {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function json(res, status, body) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

function text(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(body);
}

function bearer(req) {
  const value = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1].trim() : null;
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 256_000) throw Object.assign(new Error("payload_too_large"), { status: 413 });
  }
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

async function loadStore(dataFile) {
  try {
    const raw = await readFile(dataFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, orgs: {} };
  }
}

async function saveStore(dataFile, store) {
  await mkdir(dirname(dataFile), { recursive: true });
  const tmp = `${dataFile}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2));
  await rename(tmp, dataFile);
}

function requireAdmin(req, adminToken) {
  if (!adminToken) return false;
  const got = bearer(req);
  return !!got && safeEqual(got, adminToken);
}

function findOrgByWriteToken(store, orgId, gotToken) {
  const org = store.orgs[orgId];
  if (!org || !gotToken) return null;
  return safeEqual(hash(gotToken), org.writeTokenHash) ? org : null;
}

function findOrgByReadToken(store, orgId, gotToken) {
  const org = store.orgs[orgId];
  if (!org || !gotToken) return null;
  return safeEqual(hash(gotToken), org.readTokenHash) ? org : null;
}

function publicOrg(org) {
  return {
    orgId: org.orgId,
    name: org.name,
    teammates: Object.values(org.teammates || {}).sort((a, b) =>
      a.teammateName.localeCompare(b.teammateName)
    ),
    updatedAt: org.updatedAt,
  };
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const providerId = String(snapshot.providerId || "").trim();
  const displayName = String(snapshot.displayName || providerId).trim();
  if (!providerId || !displayName) return null;
  return {
    providerId,
    displayName,
    plan: typeof snapshot.plan === "string" ? snapshot.plan : null,
    lines: Array.isArray(snapshot.lines) ? snapshot.lines.slice(0, 32) : [],
    fetchedAt: typeof snapshot.fetchedAt === "string" ? snapshot.fetchedAt : new Date().toISOString(),
  };
}

async function createOrg(req, res, dataFile, adminToken) {
  if (!requireAdmin(req, adminToken)) return json(res, 401, { error: "admin_auth_required" });
  const body = await readJson(req);
  const name = String(body.name || "").trim();
  if (!name) return json(res, 400, { error: "name_required" });

  const store = await loadStore(dataFile);
  const base = slug(name) || "org";
  let orgId = base;
  while (store.orgs[orgId]) orgId = `${base}-${randomBytes(3).toString("hex")}`;

  const writeToken = token("ub_write");
  const readToken = token("ub_read");
  const now = new Date().toISOString();
  store.orgs[orgId] = {
    orgId,
    name,
    writeTokenHash: hash(writeToken),
    readTokenHash: hash(readToken),
    teammates: {},
    createdAt: now,
    updatedAt: now,
  };
  await saveStore(dataFile, store);
  return json(res, 201, { orgId, name, writeToken, readToken });
}

async function ingestUsage(req, res, dataFile) {
  const body = await readJson(req);
  const orgId = slug(body.orgId);
  const teammateId = slug(body.teammateId);
  const teammateName = String(body.teammateName || "").trim();
  const snapshot = normalizeSnapshot(body.snapshot);
  if (!orgId || !teammateId || !teammateName || !snapshot) {
    return json(res, 400, { error: "org_teammate_and_snapshot_required" });
  }

  const store = await loadStore(dataFile);
  const org = findOrgByWriteToken(store, orgId, bearer(req));
  if (!org) return json(res, 401, { error: "write_auth_required" });

  const now = new Date().toISOString();
  const teammate = org.teammates[teammateId] || {
    teammateId,
    teammateName,
    snapshots: {},
    createdAt: now,
  };
  teammate.teammateName = teammateName;
  teammate.snapshots[snapshot.providerId] = snapshot;
  teammate.updatedAt = now;
  org.teammates[teammateId] = teammate;
  org.updatedAt = now;
  await saveStore(dataFile, store);
  return json(res, 202, { status: "accepted", orgId, teammateId, providerId: snapshot.providerId });
}

async function readUsage(req, res, dataFile, orgId, tokenFromQuery) {
  const store = await loadStore(dataFile);
  const org = findOrgByReadToken(store, slug(orgId), bearer(req) || tokenFromQuery);
  if (!org) return json(res, 401, { error: "read_auth_required" });
  return json(res, 200, publicOrg(org));
}

function tvHtml(orgId, readToken) {
  const safeOrgId = String(orgId).replace(/[^a-z0-9-]/g, "");
  const safeToken = String(readToken || "").replace(/[^A-Za-z0-9._-]/g, "");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UsageBoard TV</title>
  <style>
    body { margin: 0; font: 16px system-ui, sans-serif; background: #101214; color: #f4f7f8; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 1px solid #2a3034; }
    main { padding: 24px 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    article { border: 1px solid #2a3034; border-radius: 8px; padding: 16px; background: #171a1d; }
    h1, h2, h3, p { margin: 0; }
    h2 { font-size: 20px; margin-bottom: 12px; }
    .provider { border-top: 1px solid #2a3034; padding-top: 10px; margin-top: 10px; }
    .line { display: flex; justify-content: space-between; gap: 12px; margin-top: 6px; color: #cbd2d6; }
    .bar { height: 8px; background: #30373d; border-radius: 999px; overflow: hidden; margin-top: 6px; }
    .fill { height: 100%; background: #49c78d; }
    .muted { color: #89939a; }
  </style>
</head>
<body>
  <header>
    <h1>UsageBoard TV</h1>
    <p id="status" class="muted">Loading</p>
  </header>
  <main id="app"></main>
  <script>
    const orgId = "${safeOrgId}";
    const token = "${safeToken}";
    const app = document.getElementById("app");
    const status = document.getElementById("status");
    function metric(line) {
      if (line.type === "progress") {
        const pct = Math.max(0, Math.min(100, Math.round((line.used / line.limit) * 100)));
        return '<div class="line"><span>' + line.label + '</span><span>' + pct + '%</span></div><div class="bar"><div class="fill" style="width:' + pct + '%"></div></div>';
      }
      return '<div class="line"><span>' + line.label + '</span><span>' + (line.value || line.text || '') + '</span></div>';
    }
    async function load() {
      const res = await fetch('/v1/orgs/' + orgId + '/usage?token=' + encodeURIComponent(token));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'load_failed');
      status.textContent = data.name + ' · ' + new Date().toLocaleTimeString();
      app.innerHTML = data.teammates.map((mate) => {
        const providers = Object.values(mate.snapshots || {}).map((snap) =>
          '<section class="provider"><h3>' + snap.displayName + (snap.plan ? ' · ' + snap.plan : '') + '</h3>' + (snap.lines || []).map(metric).join('') + '</section>'
        ).join('');
        return '<article><h2>' + mate.teammateName + '</h2>' + providers + '</article>';
      }).join('');
    }
    load().catch((e) => { status.textContent = e.message; });
    setInterval(() => load().catch((e) => { status.textContent = e.message; }), 15000);
  </script>
</body>
</html>`;
}

export function createCollector({ dataFile = DEFAULT_DATA_FILE, adminToken = process.env.USAGEBOARD_ADMIN_TOKEN } = {}) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "OPTIONS") return json(res, 204, {});
      if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { status: "ok" });
      if (req.method === "POST" && url.pathname === "/v1/orgs") return createOrg(req, res, dataFile, adminToken);
      if (req.method === "POST" && url.pathname === "/v1/usage") return ingestUsage(req, res, dataFile);

      const usageMatch = /^\/v1\/orgs\/([^/]+)\/usage$/.exec(url.pathname);
      if (req.method === "GET" && usageMatch) return readUsage(req, res, dataFile, usageMatch[1], url.searchParams.get("token"));

      const tvMatch = /^\/tv\/([^/]+)$/.exec(url.pathname);
      if (req.method === "GET" && tvMatch) return text(res, 200, tvHtml(tvMatch[1], url.searchParams.get("token")), "text/html; charset=utf-8");

      return json(res, 404, { error: "not_found" });
    } catch (error) {
      return json(res, error.status || 500, { error: error.message || "server_error" });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const dataFile = process.env.USAGEBOARD_DATA_FILE || DEFAULT_DATA_FILE;
  const server = createCollector({ dataFile });
  server.listen(port, () => {
    console.log(`UsageBoard collector listening on http://127.0.0.1:${port}`);
    if (!process.env.USAGEBOARD_ADMIN_TOKEN) {
      console.log("USAGEBOARD_ADMIN_TOKEN is not set; org creation is disabled.");
    }
  });
}
