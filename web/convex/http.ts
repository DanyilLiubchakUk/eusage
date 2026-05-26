import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return Response.json({ ok: true, service: "eUsage collector" });
  }),
});

http.route({
  path: "/v1/snapshots",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const token = readBearerToken(request);

    if (!token) {
      return json({ error: "missing_write_token" }, 401);
    }

    const body = await readSnapshotBody(request);

    if (!body.ok) {
      return json({ error: body.error }, 400);
    }

    const writeTokenHash = await sha256Hex(token);
    const teammate = await ctx.db
      .query("teammates")
      .withIndex("by_write_token_hash", (query) =>
        query.eq("writeTokenHash", writeTokenHash),
      )
      .first();

    if (!teammate || teammate.revokedAt) {
      return json({ error: "invalid_write_token" }, 401);
    }

    const updatedAt = Date.now();
    const existingSnapshot = await ctx.db
      .query("snapshots")
      .withIndex("by_org_teammate_provider", (query) =>
        query
          .eq("orgId", teammate.orgId)
          .eq("teammateId", teammate.teammateId)
          .eq("providerId", body.value.providerId),
      )
      .first();

    if (existingSnapshot) {
      await ctx.db.patch(existingSnapshot._id, {
        snapshot: body.value.snapshot,
        updatedAt,
      });
    } else {
      await ctx.db.insert("snapshots", {
        orgId: teammate.orgId,
        teammateId: teammate.teammateId,
        providerId: body.value.providerId,
        snapshot: body.value.snapshot,
        updatedAt,
      });
    }

    await ctx.db.patch(teammate._id, { lastUsedAt: updatedAt });

    return json({
      ok: true,
      orgId: teammate.orgId,
      teammateId: teammate.teammateId,
      updatedAt,
    });
  }),
});

type SnapshotBody = {
  providerId: string;
  snapshot: unknown;
};

type SnapshotBodyResult =
  | { ok: true; value: SnapshotBody }
  | { ok: false; error: string };

async function readSnapshotBody(request: Request): Promise<SnapshotBodyResult> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  if (!value || typeof value !== "object") {
    return { ok: false, error: "invalid_body" };
  }

  const body = value as Record<string, unknown>;

  if (typeof body.providerId !== "string" || body.providerId.length === 0) {
    return { ok: false, error: "missing_provider_id" };
  }

  return {
    ok: true,
    value: {
      providerId: body.providerId,
      snapshot: body.snapshot ?? {},
    },
  };
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(value: unknown, status = 200) {
  return Response.json(value, { status });
}

export default http;
