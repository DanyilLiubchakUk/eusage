import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeCtx } from "../test-helpers.js"

const loadPlugin = async () => {
  await import("./plugin.js")
  return globalThis.__openusage_plugin
}

describe("codex plugin", () => {
  beforeEach(() => {
    delete globalThis.__openusage_plugin
    vi.resetModules()
  })

  const expectStaleFileAuthFallsBackToKeychain = async (refreshResponse) => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old-file-token", refresh_token: "old-file-refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) return refreshResponse
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "12" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
  }

  const writeFreshCodexAuth = (ctx, {
    path = "~/.codex/auth.json",
    accessToken = "token",
    accountId,
  } = {}) => {
    const tokens = { access_token: accessToken }
    if (accountId) tokens.account_id = accountId
    ctx.host.fs.writeText(path, JSON.stringify({
      tokens,
      last_refresh: new Date().toISOString(),
    }))
  }

  const mockCodexUsageResponse = (ctx, body = {}) => {
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify(body),
    })
  }

  const okTokenUsage = (daily) => ({ status: "ok", data: { daily } })

  it("throws when auth missing", async () => {
    const ctx = makeCtx()
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("loads auth from keychain when auth file is missing", async () => {
    const ctx = makeCtx()
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("does not read keychain when file auth succeeds", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "file-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockImplementation(() => {
      throw new Error("keychain should not be read")
    })
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer file-token")
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("uses CODEX_HOME auth path when env var is set", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "/tmp/codex-home" : null))
    ctx.host.fs.writeText("/tmp/codex-home/auth.json", JSON.stringify({
      tokens: { access_token: "env-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer env-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("uses ~/.config/codex/auth.json before ~/.codex/auth.json when env is not set", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "legacy-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer config-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("does not fall back when CODEX_HOME is set but missing auth file", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "/tmp/missing-codex-home" : null))
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "legacy-token" },
      last_refresh: new Date().toISOString(),
    }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("throws when auth json is invalid", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", "{bad")
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("falls back to keychain when auth file is invalid", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", "{bad")
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("supports hex-encoded keychain auth payload", async () => {
    const ctx = makeCtx()
    const raw = JSON.stringify({
      tokens: { access_token: "hex-token" },
      last_refresh: new Date().toISOString(),
    })
    const hex = Buffer.from(raw, "utf8").toString("hex")
    ctx.host.keychain.readGenericPassword.mockReturnValue(hex)
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer hex-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("throws when auth lacks tokens and api key", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({ tokens: {} }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("refreshes token and formats usage", async () => {
    const ctx = makeCtx()
    const authPath = "~/.codex/auth.json"
    ctx.host.fs.writeText(authPath, JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh", account_id: "acc" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      return {
        status: 200,
        headers: {
          "x-codex-primary-used-percent": "25",
          "x-codex-secondary-used-percent": "50",
          "x-codex-credits-balance": "100",
        },
        bodyText: JSON.stringify({
          plan_type: "pro",
          rate_limit: {
            primary_window: { reset_after_seconds: 60, used_percent: 10 },
            secondary_window: { reset_after_seconds: 120, used_percent: 20 },
          },
        }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Pro 20x")
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Weekly")).toBeTruthy()
    const credits = result.lines.find((line) => line.label === "Credits")
    expect(credits).toBeTruthy()
    expect(credits.used).toBe(900)
  })

  it("maps prolite plan to Pro 5x", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {
        "x-codex-primary-used-percent": "25",
        "x-codex-secondary-used-percent": "50",
        "x-codex-credits-balance": "100",
      },
      bodyText: JSON.stringify({
        plan_type: "prolite",
        rate_limit: {
          primary_window: { reset_after_seconds: 60, used_percent: 10 },
          secondary_window: { reset_after_seconds: 120, used_percent: 20 },
        },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Pro 5x")
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Weekly")).toBeTruthy()
    const credits = result.lines.find((line) => line.label === "Credits")
    expect(credits).toBeTruthy()
    expect(credits.used).toBe(900)
  })

  it("uses zero credits from the response body when the account has no credits", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {
        "x-codex-credits-balance": "1000",
      },
      bodyText: JSON.stringify({
        plan_type: "plus",
        rate_limit: {
          primary_window: { used_percent: 46, limit_window_seconds: 18000, reset_after_seconds: 6699 },
          secondary_window: { used_percent: 15, limit_window_seconds: 604800, reset_after_seconds: 505326 },
        },
        code_review_rate_limit: null,
        additional_rate_limits: null,
        credits: {
          has_credits: false,
          unlimited: false,
          overage_limit_reached: false,
          balance: "0",
          approx_local_messages: [0, 0],
          approx_cloud_messages: [0, 0],
        },
        spend_control: {
          reached: false,
          individual_limit: null,
        },
        rate_limit_reached_type: null,
        promo: null,
        referral_beacon: null,
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const credits = result.lines.find((line) => line.label === "Credits")
    expect(credits).toBeTruthy()
    expect(credits.used).toBe(1000)
    expect(credits.limit).toBe(1000)
  })

  it("emits Codex source facts, metric samples, versions, and redacted payload", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      const accessToken = "codex-access-token-secret"
      const nowSec = Math.floor(Date.now() / 1000)
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: accessToken, account_id: "acct-1" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: {
          "x-codex-primary-used-percent": "25",
          "x-codex-secondary-used-percent": "50",
        },
        bodyText: JSON.stringify({
          plan_type: "plus",
          accessToken: accessToken,
          rate_limit: {
            primary_window: {
              used_percent: 10,
              reset_after_seconds: 3600,
              limit_window_seconds: 18000,
            },
            secondary_window: {
              used_percent: 20,
              reset_at: nowSec + 604800,
              limit_window_seconds: 604800,
            },
          },
          code_review_rate_limit: {
            primary_window: {
              used_percent: 7,
              reset_at: nowSec + 604800,
              limit_window_seconds: 604800,
            },
          },
          credits: {
            has_credits: true,
            unlimited: false,
            balance: 5.39,
          },
        }),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: {
          daily: [
            {
              date: "2026-06-01",
              inputTokens: 400,
              outputTokens: 600,
              cachedInputTokens: 234,
              totalTokens: 1234,
              costUSD: 0.42,
            },
          ],
        },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const codex = result.sourceFacts.summary.provider.codex

      expect(result.sourceFacts.summaryVersion).toBe("1.0.0")
      expect(result.sourceFacts.extractorVersion).toEqual({ codex: "1.0.0" })
      expect(result.sourceFacts.periodStart).toBe(Date.parse("2026-06-01T00:00:00.000Z"))
      expect(result.sourceFacts.periodEnd).toBe(Date.parse("2026-06-02T00:00:00.000Z"))
      expect(result.sourceFacts.periodKey).toBe("codex:2026-06-01")
      expect(result.sourceFacts.metricFamilies).toEqual(
        expect.arrayContaining(["tokens", "estimatedCost", "quotaPressure", "credits"])
      )
      expect(result.sourceFacts.summary).toMatchObject({
        quotaPercent: 25,
        creditsRemaining: 5.39,
        tokensTotal: 1234,
        estimatedCostUsd: 0.42,
      })
      const expectedBucket = {
        kind: "reportingDay",
        day: "2026-06-01",
        reportingTimeZone: "UTC",
        startMs: Date.parse("2026-06-01T00:00:00.000Z"),
        endMs: Date.parse("2026-06-02T00:00:00.000Z"),
      }
      expect(codex).toMatchObject({
        planType: "plus",
        planName: "Plus",
        sessionUsedPercent: 25,
        weeklyUsedPercent: 50,
        reviewUsedPercent: 7,
        sessionWindowSeconds: 18000,
        weeklyWindowSeconds: 604800,
        reviewWindowSeconds: 604800,
        creditsRemaining: 5.39,
        todayTokens: 1234,
        todayEstimatedCostUsd: 0.42,
      })
      expect(result.providerAccountDetections).toEqual([
        {
          providerId: "codex",
          providerName: "Codex",
          identityKind: "providerAccountId",
          identityValue: "acct-1",
          identityConfidence: "high",
        },
      ])
      expect(result.sourceFacts.metricSamples).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metricKey: "codex.session.percentUsed",
            value: 25,
            unit: "percent",
            sampleDay: "2026-06-01",
          }),
          expect.objectContaining({
            metricKey: "codex.weekly.percentUsed",
            value: 50,
            unit: "percent",
          }),
          expect.objectContaining({
            metricKey: "codex.reviews.percentUsed",
            value: 7,
            unit: "percent",
          }),
          expect.objectContaining({
            metricKey: "codex.tokens.total",
            value: 1234,
            unit: "tokens",
            periodStart: expectedBucket.startMs,
            periodEnd: expectedBucket.endMs,
            bucket: expectedBucket,
          }),
          expect.objectContaining({
            metricKey: "codex.cost.estimated",
            value: 0.42,
            unit: "usd",
            source: "estimated",
            bucket: expectedBucket,
          }),
        ])
      )
      expect(result.rawPayload.usage.accessToken).toBe("[REDACTED]")
      expect(JSON.stringify(result.rawPayload)).not.toContain(accessToken)
      expect(JSON.stringify(result.rawPayload)).not.toContain("acct-1")
    } finally {
      vi.useRealTimers()
    }
  })

  it("omits optional Codex credits without dropping rate-limit facts", async () => {
    const ctx = makeCtx()
    ctx.nowIso = "2026-06-01T12:00:00.000Z"
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 11, reset_after_seconds: 60 },
          secondary_window: { used_percent: 22, reset_after_seconds: 120 },
        },
      }),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "no_runner" })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.sourceFacts.summary.creditsRemaining).toBeUndefined()
    expect(result.sourceFacts.summary.provider.codex).toMatchObject({
      sessionUsedPercent: 11,
      weeklyUsedPercent: 22,
    })
    expect(result.sourceFacts.metricSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricKey: "codex.session.percentUsed", value: 11 }),
        expect.objectContaining({ metricKey: "codex.weekly.percentUsed", value: 22 }),
      ])
    )
    expect(result.sourceFacts.metricSamples.find((sample) => sample.metricKey === "codex.credits.remaining"))
      .toBeUndefined()
  })

  it("emits additional Codex rate-limit windows as provider facts", async () => {
    const ctx = makeCtx()
    ctx.nowIso = "2026-06-01T12:00:00.000Z"
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          {
            limit_name: "GPT-5.3-Codex-Spark",
            metered_feature: "codex_bengalfox",
            rate_limit: {
              primary_window: { used_percent: 33, reset_after_seconds: 3600 },
              secondary_window: { used_percent: 44, reset_after_seconds: 7200 },
            },
          },
        ],
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.sourceFacts.summary.provider.codex.additionalRateLimits).toEqual([
      expect.objectContaining({
        name: "Spark",
        meteredFeature: "codex_bengalfox",
        sessionUsedPercent: 33,
        weeklyUsedPercent: 44,
      }),
    ])
    expect(result.sourceFacts.metricSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricKey: "codex.rateLimit.spark.session.percentUsed",
          value: 33,
        }),
        expect.objectContaining({
          metricKey: "codex.rateLimit.spark.weekly.percentUsed",
          value: 44,
        }),
      ])
    )
  })

  it("uses the Windows Codex file auth path and skips keychain fallback", async () => {
    const ctx = makeCtx()
    ctx.app.platform = "windows"
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "windows-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockImplementation(() => {
      throw new Error("Windows keychain should not be read")
    })
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer windows-token")
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("refreshes keychain auth and writes back to keychain", async () => {
    const ctx = makeCtx()
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh", account_id: "acc" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(ctx.host.keychain.writeGenericPassword).toHaveBeenCalled()
    const [service, payload] = ctx.host.keychain.writeGenericPassword.mock.calls[0]
    expect(service).toBe("Codex Auth")
    expect(String(payload)).toContain("\"access_token\":\"new\"")
  })

  it("omits token lines when ccusage reports no_runner", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "no_runner" })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Today")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Yesterday")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Last 30 Days")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("adds token lines from codex ccusage format and passes codex provider", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-20T16:00:00.000Z"))

    const ctx = makeCtx()
    ctx.nowIso = "2026-02-20T16:00:00.000Z"
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    const now = new Date()
    const month = now.toLocaleString("en-US", { month: "short" })
    const day = String(now.getDate()).padStart(2, "0")
    const year = now.getFullYear()
    const todayKey = month + " " + day + ", " + year
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
        { date: todayKey, totalTokens: 150, costUSD: 0.75 },
        { date: "Feb 01, 2026", totalTokens: 300, costUSD: 1.0 },
        ],
      },
    })

    try {
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      const today = result.lines.find((l) => l.label === "Today")
      expect(today).toBeTruthy()
      expect(today.value).toContain("150 tokens")
      expect(today.value).toContain("$0.75")

      const last30 = result.lines.find((l) => l.label === "Last 30 Days")
      expect(last30).toBeTruthy()
      expect(last30.value).toContain("450 tokens")
      expect(last30.value).toContain("$1.75")

      const chart = result.lines.find((l) => l.label === "Usage Trend")
      expect(chart).toMatchObject({
        type: "barChart",
        note: "Estimated from local Codex logs for the selected account.",
        color: "#74AA9C",
      })
      expect(chart.points).toEqual([
        { label: "2/1", value: 300, valueLabel: "300 tokens" },
        { label: "2/20", value: 150, valueLabel: "150 tokens" },
      ])

      expect(ctx.host.ccusage.query).toHaveBeenCalled()
      const firstCall = ctx.host.ccusage.query.mock.calls[0][0]
      expect(firstCall.provider).toBe("codex")
      expect(firstCall.timezone).toBe("UTC")
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const sinceYear = String(since.getFullYear())
      const sinceMonth = String(since.getMonth() + 1).padStart(2, "0")
      const sinceDay = String(since.getDate()).padStart(2, "0")
      expect(firstCall.since).toBe(sinceYear + sinceMonth + sinceDay)
    } finally {
      vi.useRealTimers()
    }
  })

  it("adds Codex model percentage lines from ccusage daily model totals", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
          {
            date: "2026-02-01",
            totalTokens: 400,
            models: {
              "gpt-5.1-codex": { totalTokens: 300 },
              "gpt-5.1-codex-mini": { inputTokens: 50, outputTokens: 50 },
            },
          },
        ],
      },
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines.find((l) => l.label === "gpt-5.1-codex")).toMatchObject({ value: "75%" })
    expect(result.lines.find((l) => l.label === "gpt-5.1-codex-mini")).toMatchObject({ value: "25%" })
  })

  it("groups Codex token usage by the team reporting timezone at day boundary", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-20T04:30:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-02-20T04:30:00.000Z"
      ctx.app.reportingTimeZone = "America/New_York"
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: {
          daily: [
            { date: "2026-02-19", totalTokens: 150, costUSD: 0.75 },
          ],
        },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      const today = result.lines.find((l) => l.label === "Today")
      expect(today).toBeTruthy()
      expect(today.value).toContain("150 tokens")
      expect(today.value).toContain("$0.75")

      const firstCall = ctx.host.ccusage.query.mock.calls[0][0]
      expect(firstCall.timezone).toBe("America/New_York")
      expect(firstCall.since).toBe("20260120")

      const expectedBucket = {
        kind: "reportingDay",
        day: "2026-02-19",
        reportingTimeZone: "America/New_York",
        startMs: Date.parse("2026-02-19T05:00:00.000Z"),
        endMs: Date.parse("2026-02-20T05:00:00.000Z"),
      }
      expect(result.sourceFacts.periodKey).toBe("codex:2026-02-19")
      expect(result.sourceFacts.periodStart).toBe(expectedBucket.startMs)
      expect(result.sourceFacts.periodEnd).toBe(expectedBucket.endMs)
      expect(result.sourceFacts.metricSamples).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metricKey: "codex.tokens.total",
            sampleDay: "2026-02-19",
            bucket: expectedBucket,
          }),
        ])
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("passes CODEX_HOME to ccusage via homePath", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "/tmp/codex-home" : null))
    ctx.host.fs.writeText("/tmp/codex-home/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "ok", data: { daily: [] } })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(ctx.host.ccusage.query).toHaveBeenCalled()
    const firstCall = ctx.host.ccusage.query.mock.calls[0][0]
    expect(firstCall.homePath).toBe("/tmp/codex-home")
  })

  it("keeps native Codex usage provider-level when no ePort partitions exist", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      writeFreshCodexAuth(ctx, { accountId: "native-account" })
      mockCodexUsageResponse(ctx)
      ctx.host.ccusage.query.mockReturnValue(okTokenUsage([
        { date: "2026-06-01", totalTokens: 50, costUSD: 0.05 },
      ]))

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      expect(result.providerAccountOutputs).toBeUndefined()
      expect(ctx.host.ccusage.query).toHaveBeenCalledTimes(1)
      expect(ctx.host.ccusage.query.mock.calls[0][0]).toMatchObject({
        provider: "codex",
        since: "20260502",
        timezone: "UTC",
      })
      expect(ctx.host.ccusage.query.mock.calls[0][0].homePath).toBeUndefined()
      expect(result.providerAccountDetections).toEqual([
        expect.objectContaining({
          identityKind: "providerAccountId",
          identityValue: "native-account",
        }),
      ])
      expect(result.lines.find((line) => line.label === "Today").value).toContain("50 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("emits account-bound child outputs for multiple ePort Codex partitions", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      writeFreshCodexAuth(ctx, { accountId: "native-account" })
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText("~/.codex/eport-accounts/acct-work/sessions/2026/06/01.jsonl", "{}\n")
      ctx.host.fs.writeText("~/.codex/eport-accounts/acct-side/sessions/2026/06/01.jsonl", "{}\n")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === "~/.codex/eport-accounts/acct-work") {
          return okTokenUsage([
            {
              date: "2026-06-01",
              inputTokens: 40,
              outputTokens: 60,
              cachedInputTokens: 5,
              totalTokens: 100,
              costUSD: 0.1,
            },
          ])
        }
        if (opts.homePath === "~/.codex/eport-accounts/acct-side") {
          return okTokenUsage([
            {
              date: "2026-06-01",
              inputTokens: 100,
              outputTokens: 150,
              cachedInputTokens: 10,
              totalTokens: 250,
              costUSD: 0.25,
            },
          ])
        }
        return okTokenUsage([{ date: "2026-06-01", totalTokens: 25, costUSD: 0.02 }])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      expect(ctx.host.ccusage.query).toHaveBeenCalledTimes(3)
      expect(ctx.host.ccusage.query.mock.calls.map((call) => call[0].homePath)).toEqual([
        undefined,
        "~/.codex/eport-accounts/acct-side",
        "~/.codex/eport-accounts/acct-work",
      ])
      expect(result.lines.find((line) => line.label === "Today").value).toContain("25 tokens")
      expect(result.providerAccountDetections).toEqual([
        expect.objectContaining({ identityValue: "native-account" }),
      ])

      const outputsByAccount = new Map(
        result.providerAccountOutputs.map((output) => [
          output.providerAccountDetections[0].identityValue,
          output,
        ])
      )
      expect(outputsByAccount.size).toBe(2)
      expect(outputsByAccount.get("acct-work").providerAccountDetections).toEqual([
        {
          providerId: "codex",
          providerName: "Codex",
          identityKind: "providerAccountId",
          identityValue: "acct-work",
          identityConfidence: "high",
        },
      ])
      expect(outputsByAccount.get("acct-work").lines.find((line) => line.label === "Today").value)
        .toContain("100 tokens")
      expect(outputsByAccount.get("acct-side").lines.find((line) => line.label === "Today").value)
        .toContain("250 tokens")
      expect(outputsByAccount.get("acct-work").sourceFacts.dataIdentity)
        .toBe("eport:codex:acct-work:daily:2026-06-01")
      expect(outputsByAccount.get("acct-side").sourceFacts.dataIdentity)
        .toBe("eport:codex:acct-side:daily:2026-06-01")
      expect(outputsByAccount.get("acct-work").sourceFacts.metricSamples).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metricKey: "codex.tokens.total",
            value: 100,
            source: "calculated",
          }),
        ])
      )
      expect(outputsByAccount.get("acct-side").sourceFacts.summary.tokensTotal).toBe(250)
    } finally {
      vi.useRealTimers()
    }
  })

  it("merges ePort Codex usage into native usage for the same account", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      writeFreshCodexAuth(ctx, { accountId: "native-account" })
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText(
        "~/.codex/eport-accounts/fp-native/eport/provider-account.json",
        JSON.stringify({
          version: 1,
          provider: "codex",
          providerAccountFingerprint: "fp-native",
          providerAccountIdentity: {
            identityKind: "providerAccountId",
            identityValue: "native-account",
            identityConfidence: "high",
          },
        })
      )
      ctx.host.fs.writeText("~/.codex/eport-accounts/fp-native/sessions/2026/06/01.jsonl", "{}\n")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === "~/.codex/eport-accounts/fp-native") {
          return okTokenUsage([
            {
              date: "2026-06-01",
              inputTokens: 40,
              outputTokens: 60,
              cachedInputTokens: 5,
              totalTokens: 100,
              costUSD: 0.1,
            },
          ])
        }
        return okTokenUsage([{ date: "2026-06-01", totalTokens: 25, costUSD: 0.02 }])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      expect(ctx.host.ccusage.query).toHaveBeenCalledTimes(2)
      expect(result.providerAccountOutputs).toBeUndefined()
      expect(result.providerAccountDetections).toEqual([
        expect.objectContaining({
          identityKind: "providerAccountId",
          identityValue: "native-account",
        }),
      ])
      expect(result.lines.find((line) => line.label === "Today").value)
        .toContain("125 tokens")
      expect(result.sourceFacts.summary.tokensTotal).toBe(125)
      expect(result.sourceFacts.summary.estimatedCostUsd).toBe(0.12)
      expect(result.sourceFacts.metricSamples).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metricKey: "codex.tokens.total",
            value: 125,
          }),
        ])
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("surfaces same-account ePort Codex read failures instead of merging them away", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      writeFreshCodexAuth(ctx, { accountId: "native-account" })
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText(
        "~/.codex/eport-accounts/fp-native/eport/provider-account.json",
        JSON.stringify({
          version: 1,
          provider: "codex",
          providerAccountFingerprint: "fp-native",
          providerAccountIdentity: {
            identityKind: "providerAccountId",
            identityValue: "native-account",
            identityConfidence: "high",
          },
        })
      )
      ctx.host.fs.writeText("~/.codex/eport-accounts/fp-native/sessions/2026/06/01.jsonl", "{}\n")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === "~/.codex/eport-accounts/fp-native") return { status: "runner_failed" }
        return okTokenUsage([{ date: "2026-06-01", totalTokens: 25, costUSD: 0.02 }])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      expect(result.lines.find((line) => line.label === "Today").value)
        .toContain("25 tokens")
      expect(result.providerAccountOutputs).toHaveLength(1)
      expect(result.providerAccountOutputs[0].providerAccountDetections[0].identityValue)
        .toBe("native-account")
      expect(result.providerAccountOutputs[0].lines).toEqual([
        expect.objectContaining({
          type: "badge",
          label: "Status",
          text: "Usage unavailable",
        }),
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it("emits an account-bound empty state for an empty ePort Codex partition", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      writeFreshCodexAuth(ctx)
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText("~/.codex/eport-accounts/acct-empty/.keep", "")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === "~/.codex/eport-accounts/acct-empty") return okTokenUsage([])
        return okTokenUsage([])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const output = result.providerAccountOutputs[0]

      expect(result.providerAccountOutputs).toHaveLength(1)
      expect(output.providerAccountDetections[0].identityValue).toBe("acct-empty")
      expect(output.lines.find((line) => line.label === "Today").value).toContain("0 tokens")
      expect(output.lines.find((line) => line.label === "Yesterday").value).toContain("0 tokens")
      expect(output.sourceFacts.dataIdentity).toBe("eport:codex:acct-empty:daily:2026-06-01")
      expect(output.sourceFacts.summary.tokensTotal).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it("surfaces unreadable ePort Codex partitions as account-bound error output", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      writeFreshCodexAuth(ctx)
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText("~/.codex/eport-accounts/acct-bad/sessions/2026/06/01.jsonl", "{}\n")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === "~/.codex/eport-accounts/acct-bad") return { status: "runner_failed" }
        return okTokenUsage([])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const output = result.providerAccountOutputs[0]

      expect(output.providerAccountDetections[0].identityValue).toBe("acct-bad")
      expect(output.lines).toEqual([
        expect.objectContaining({
          type: "badge",
          label: "Status",
          text: "Usage unavailable",
        }),
      ])
      expect(output.sourceFacts.dataIdentity).toBe("eport:codex:acct-bad:daily:2026-06-01")
      expect(output.sourceFacts.summary.provider.codex.eportPartitionStatus).toBe("runner_failed")
      expect(output.rawPayload.tokenUsage.status).toBe("runner_failed")
    } finally {
      vi.useRealTimers()
    }
  })

  it("discovers ePort Codex partitions under CODEX_HOME", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "/tmp/codex-home" : null))
      writeFreshCodexAuth(ctx, { path: "/tmp/codex-home/auth.json" })
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText("/tmp/codex-home/eport-accounts/acct-env/sessions/2026/06/01.jsonl", "{}\n")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === "/tmp/codex-home/eport-accounts/acct-env") {
          return okTokenUsage([{ date: "2026-06-01", totalTokens: 75, costUSD: 0.07 }])
        }
        return okTokenUsage([{ date: "2026-06-01", totalTokens: 5, costUSD: 0.01 }])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      expect(ctx.host.ccusage.query.mock.calls.map((call) => call[0].homePath)).toEqual([
        "/tmp/codex-home",
        "/tmp/codex-home/eport-accounts/acct-env",
      ])
      expect(result.providerAccountOutputs).toHaveLength(1)
      expect(result.providerAccountOutputs[0].providerAccountDetections[0].identityValue).toBe("acct-env")
      expect(result.providerAccountOutputs[0].lines.find((line) => line.label === "Today").value)
        .toContain("75 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("discovers and merges ePort Codex partitions under Windows CODEX_HOME", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.app.platform = "windows"
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      const codexHome = "C:\\Users\\dev\\.codex"
      const partitionHome = `${codexHome}\\eport-accounts\\fp-native`
      ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? codexHome : null))
      writeFreshCodexAuth(ctx, { path: `${codexHome}\\auth.json`, accountId: "native-account" })
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText(
        `${partitionHome}\\eport\\provider-account.json`,
        JSON.stringify({
          version: 1,
          provider: "codex",
          providerAccountFingerprint: "fp-native",
          providerAccountIdentity: {
            identityKind: "providerAccountId",
            identityValue: "native-account",
            identityConfidence: "high",
          },
        })
      )
      ctx.host.fs.writeText(`${partitionHome}\\sessions\\2026\\06\\01.jsonl`, "{}\n")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === partitionHome) {
          return okTokenUsage([{ date: "2026-06-01", totalTokens: 75, costUSD: 0.07 }])
        }
        return okTokenUsage([{ date: "2026-06-01", totalTokens: 5, costUSD: 0.01 }])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      expect(ctx.host.ccusage.query.mock.calls.map((call) => call[0].homePath)).toEqual([
        codexHome,
        partitionHome,
      ])
      expect(result.providerAccountOutputs).toBeUndefined()
      expect(result.lines.find((line) => line.label === "Today").value)
        .toContain("80 tokens")
      expect(result.sourceFacts.summary.tokensTotal).toBe(80)
      expect(result.sourceFacts.summary.estimatedCostUsd).toBe(0.08)
    } finally {
      vi.useRealTimers()
    }
  })

  it("uses the default Codex home for Windows ePort partition discovery", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.app.platform = "windows"
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      writeFreshCodexAuth(ctx, { accountId: "native-account" })
      mockCodexUsageResponse(ctx)
      ctx.host.fs.writeText(
        "~/.codex/eport-accounts/fp-side/eport/provider-account.json",
        JSON.stringify({
          version: 1,
          provider: "codex",
          providerAccountFingerprint: "fp-side",
          providerAccountIdentity: {
            identityKind: "providerAccountId",
            identityValue: "side-account",
            identityConfidence: "high",
          },
        })
      )
      ctx.host.fs.writeText("~/.codex/eport-accounts/fp-side/sessions/2026/06/01.jsonl", "{}\n")
      ctx.host.ccusage.query.mockImplementation((opts) => {
        if (opts.homePath === "~/.codex/eport-accounts/fp-side") {
          return okTokenUsage([{ date: "2026-06-01", totalTokens: 75, costUSD: 0.07 }])
        }
        return okTokenUsage([{ date: "2026-06-01", totalTokens: 5, costUSD: 0.01 }])
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      expect(ctx.host.ccusage.query.mock.calls.map((call) => call[0].homePath)).toEqual([
        undefined,
        "~/.codex/eport-accounts/fp-side",
      ])
      expect(result.providerAccountOutputs).toHaveLength(1)
      expect(result.providerAccountOutputs[0].providerAccountDetections[0].identityValue)
        .toBe("side-account")
    } finally {
      vi.useRealTimers()
    }
  })

  it("queries ccusage on each probe", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: { daily: [{ date: "2026-02-01", totalTokens: 100, totalCost: 0.5 }] },
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
    plugin.probe(ctx)

    expect(ctx.host.ccusage.query).toHaveBeenCalledTimes(2)
  })

  it("shows empty Today state when ccusage returns ok with empty daily array", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "ok", data: { daily: [] } })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const todayLine = result.lines.find((l) => l.label === "Today")
    expect(todayLine).toBeTruthy()
    expect(todayLine.value).toContain("$0.00")
    expect(todayLine.value).toContain("0 tokens")
    const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
    expect(yesterdayLine).toBeTruthy()
    expect(yesterdayLine.value).toContain("$0.00")
    expect(yesterdayLine.value).toContain("0 tokens")
    expect(result.lines.find((l) => l.label === "Last 30 Days")).toBeUndefined()
  })

  it("shows empty Yesterday state when yesterday's totals are zero (regression)", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const month = yesterday.toLocaleString("en-US", { month: "short" })
    const day = String(yesterday.getDate()).padStart(2, "0")
    const year = yesterday.getFullYear()
    const yesterdayKey = month + " " + day + ", " + year
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
        { date: yesterdayKey, totalTokens: 0, costUSD: 0 },
        ],
      },
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
    expect(yesterdayLine).toBeTruthy()
    expect(yesterdayLine.value).toContain("$0.00")
    expect(yesterdayLine.value).toContain("0 tokens")
  })

  it("shows empty Today when history exists but today is missing (regression)", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
        { date: "Feb 01, 2026", totalTokens: 300, costUSD: 1.0 },
        ],
      },
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const todayLine = result.lines.find((l) => l.label === "Today")
    expect(todayLine).toBeTruthy()
    expect(todayLine.value).toContain("$0.00")
    expect(todayLine.value).toContain("0 tokens")
    const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
    expect(yesterdayLine).toBeTruthy()
    expect(yesterdayLine.value).toContain("$0.00")
    expect(yesterdayLine.value).toContain("0 tokens")

    const last30 = result.lines.find((l) => l.label === "Last 30 Days")
    expect(last30).toBeTruthy()
    expect(last30.value).toContain("300 tokens")
    expect(last30.value).toContain("$1.00")
  })

  it("adds Yesterday line from codex ccusage format", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    try {
      const ctx = makeCtx()
      ctx.nowIso = "2026-06-01T12:00:00.000Z"
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: {
          daily: [
          { date: "May 31, 2026", totalTokens: 220, costUSD: 1.1 },
          ],
        },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
      expect(yesterdayLine).toBeTruthy()
      expect(yesterdayLine.value).toContain("220 tokens")
      expect(yesterdayLine.value).toContain("$1.10")
    } finally {
      vi.useRealTimers()
    }
  })

  it("matches UTC timestamp day keys at month boundary (regression)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: { daily: [{ date: "2026-03-01T12:00:00Z", totalTokens: 10, costUSD: 0.1 }] },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const todayLine = result.lines.find((line) => line.label === "Today")
      expect(todayLine).toBeTruthy()
      expect(todayLine.value).toContain("10 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("matches UTC+9 timestamp day keys at month boundary (regression)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: { daily: [{ date: "2026-03-01T00:30:00+09:00", totalTokens: 20, costUSD: 0.2 }] },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const todayLine = result.lines.find((line) => line.label === "Today")
      expect(todayLine).toBeTruthy()
      expect(todayLine.value).toContain("20 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("matches UTC-8 timestamp day keys at day boundary (regression)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: { daily: [{ date: "2026-03-01T23:30:00-08:00", totalTokens: 30, costUSD: 0.3 }] },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const todayLine = result.lines.find((line) => line.label === "Today")
      expect(todayLine).toBeTruthy()
      expect(todayLine.value).toContain("30 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("throws token expired when refresh fails", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValue({ status: 401, headers: {}, bodyText: "{}" })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("throws token conflict when refresh token is reused", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValue({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_reused" } }),
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token conflict")
  })

  it("falls back to keychain when file refresh token was reused", async () => {
    await expectStaleFileAuthFallsBackToKeychain({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_reused" } }),
    })
  })

  it("falls back to keychain when file refresh token expired", async () => {
    await expectStaleFileAuthFallsBackToKeychain({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_expired" } }),
    })
  })

  it("falls back to keychain when file refresh token was revoked", async () => {
    await expectStaleFileAuthFallsBackToKeychain({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_invalidated" } }),
    })
  })

  it("falls back to keychain when file usage auth fails after refresh attempt", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old-file-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.headers.Authorization === "Bearer old-file-token") {
        return { status: 401, headers: {}, bodyText: "" }
      }
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "9" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
  })

  it("falls back to keychain when file usage auth still fails after refresh", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "file-token", refresh_token: "file-refresh" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return {
          status: 200,
          headers: {},
          bodyText: JSON.stringify({ access_token: "refreshed-file-token" }),
        }
      }
      if (opts.headers.Authorization === "Bearer file-token") {
        return { status: 401, headers: {}, bodyText: "" }
      }
      if (opts.headers.Authorization === "Bearer refreshed-file-token") {
        return { status: 401, headers: {}, bodyText: "" }
      }
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "6" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(ctx.host.keychain.readGenericPassword).toHaveBeenCalledWith("Codex Auth")
  })

  it("surfaces keychain auth error when file and keychain auth both fail", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "file-token", refresh_token: "file-refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token", refresh_token: "keychain-refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.bodyText).includes("file-refresh")) {
        return {
          status: 400,
          headers: {},
          bodyText: JSON.stringify({ error: { code: "refresh_token_reused" } }),
        }
      }
      expect(String(opts.bodyText)).toContain("keychain-refresh")
      return {
        status: 400,
        headers: {},
        bodyText: JSON.stringify({ error: { code: "refresh_token_expired" } }),
      }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Session expired")
    expect(ctx.host.keychain.readGenericPassword).toHaveBeenCalledWith("Codex Auth")
  })

  it("tries next file auth before keychain when earlier file auth is stale", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "old-config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "legacy-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.headers.Authorization === "Bearer old-config-token") {
        return { status: 401, headers: {}, bodyText: "" }
      }
      expect(opts.headers.Authorization).toBe("Bearer legacy-token")
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "7" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("does not fall back to keychain when file usage request returns server error", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "file-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({ status: 500, headers: {}, bodyText: "" })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed (HTTP 500)")
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("does not fall back to keychain when file usage response is invalid", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "file-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({ status: 200, headers: {}, bodyText: "bad" })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid")
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("does not fall back to keychain when file usage request throws", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "file-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation(() => {
      throw new Error("offline")
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed. Check your connection.")
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("throws for api key auth", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      OPENAI_API_KEY: "key",
    }))
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage not available for API key")
    expect(ctx.host.keychain.readGenericPassword).not.toHaveBeenCalled()
  })

  it("falls back to rate_limit data and review window", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 10, reset_after_seconds: 60 },
          secondary_window: { used_percent: 20, reset_after_seconds: 120 },
        },
        code_review_rate_limit: {
          primary_window: { used_percent: 15, reset_after_seconds: 90 },
        },
        credits: { balance: 500 },
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Reviews")).toBeTruthy()
    const credits = result.lines.find((line) => line.label === "Credits")
    expect(credits).toBeTruthy()
    expect(credits.used).toBe(500)
  })

  it("omits resetsAt when window lacks reset info", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 10 },
        },
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const sessionLine = result.lines.find((line) => line.label === "Session")
    expect(sessionLine).toBeTruthy()
    expect(sessionLine.resetsAt).toBeUndefined()
  })

  it("uses reset_at when present for resetsAt", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    const resetsAtExpected = new Date((nowSec + 60) * 1000).toISOString()

    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 10, reset_at: nowSec + 60 },
        },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const session = result.lines.find((line) => line.label === "Session")
    expect(session).toBeTruthy()
    expect(session.resetsAt).toBe(resetsAtExpected)
    nowSpy.mockRestore()
  })

  it("throws on http and parse errors", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValueOnce({ status: 500, headers: {}, bodyText: "" })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("HTTP 500")

    ctx.host.http.request.mockReturnValueOnce({ status: 200, headers: {}, bodyText: "bad" })
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid")
  })

  it("shows status badge when no usage data and ccusage failed", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "runner_failed" })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Today")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Yesterday")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Last 30 Days")).toBeUndefined()
    const statusLine = result.lines.find((l) => l.label === "Status")
    expect(statusLine).toBeTruthy()
    expect(statusLine.text).toBe("No usage data")
  })

  it("throws on usage request failures", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation(() => {
      throw new Error("boom")
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed")
  })

  it("throws on usage request failure after refresh", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token", refresh_token: "refresh" },
      last_refresh: new Date().toISOString(),
    }))
    let usageCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      usageCalls += 1
      if (usageCalls === 1) {
        return { status: 401, headers: {}, bodyText: "" }
      }
      throw new Error("boom")
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed after refresh")
  })

  it("surfaces additional_rate_limits as Spark lines", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)

    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 5, reset_after_seconds: 60 },
          secondary_window: { used_percent: 10, reset_after_seconds: 120 },
        },
        additional_rate_limits: [
          {
            limit_name: "GPT-5.3-Codex-Spark",
            metered_feature: "codex_bengalfox",
            rate_limit: {
              primary_window: {
                used_percent: 25,
                limit_window_seconds: 18000,
                reset_after_seconds: 3600,
                reset_at: nowSec + 3600,
              },
              secondary_window: {
                used_percent: 40,
                limit_window_seconds: 604800,
                reset_after_seconds: 86400,
                reset_at: nowSec + 86400,
              },
            },
          },
        ],
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const spark = result.lines.find((l) => l.label === "Spark")
    expect(spark).toBeTruthy()
    expect(spark.used).toBe(25)
    expect(spark.limit).toBe(100)
    expect(spark.periodDurationMs).toBe(18000000)
    expect(spark.resetsAt).toBe(new Date((nowSec + 3600) * 1000).toISOString())

    const sparkWeekly = result.lines.find((l) => l.label === "Spark Weekly")
    expect(sparkWeekly).toBeTruthy()
    expect(sparkWeekly.used).toBe(40)
    expect(sparkWeekly.limit).toBe(100)
    expect(sparkWeekly.periodDurationMs).toBe(604800000)
    expect(sparkWeekly.resetsAt).toBe(new Date((nowSec + 86400) * 1000).toISOString())

    nowSpy.mockRestore()
  })

  it("handles additional_rate_limits with missing fields and fallback labels", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          // Entry with no limit_name, no limit_window_seconds, no secondary
          {
            limit_name: "",
            rate_limit: {
              primary_window: { used_percent: 10, reset_after_seconds: 60 },
              secondary_window: null,
            },
          },
          // Malformed entry (no rate_limit)
          { limit_name: "Bad" },
          // Null entry
          null,
        ],
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const modelLine = result.lines.find((l) => l.label === "Model")
    expect(modelLine).toBeTruthy()
    expect(modelLine.used).toBe(10)
    expect(modelLine.periodDurationMs).toBe(5 * 60 * 60 * 1000) // fallback PERIOD_SESSION_MS
    // No weekly line for this entry since secondary_window is null
    expect(result.lines.find((l) => l.label === "Model Weekly")).toBeUndefined()
    // Malformed and null entries should be skipped
    expect(result.lines.find((l) => l.label === "Bad")).toBeUndefined()
  })

  it("handles missing or empty additional_rate_limits gracefully", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))

    // Missing field
    ctx.host.http.request.mockReturnValueOnce({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 5, reset_after_seconds: 60 },
        },
      }),
    })
    const plugin = await loadPlugin()
    const result1 = plugin.probe(ctx)
    expect(result1.lines.find((l) => l.label === "Spark")).toBeUndefined()

    // Empty array
    ctx.host.http.request.mockReturnValueOnce({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 5, reset_after_seconds: 60 },
        },
        additional_rate_limits: [],
      }),
    })
    const result2 = plugin.probe(ctx)
    expect(result2.lines.find((l) => l.label === "Spark")).toBeUndefined()
  })

  it("throws token expired when refresh retry is unauthorized", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token", refresh_token: "refresh" },
      last_refresh: new Date().toISOString(),
    }))
    let usageCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      usageCalls += 1
      if (usageCalls === 1) {
        return { status: 401, headers: {}, bodyText: "" }
      }
      return { status: 403, headers: {}, bodyText: "" }
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("loads keychain auth when env object is unavailable", async () => {
    const ctx = makeCtx()
    ctx.host.env = null
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("ignores blank CODEX_HOME and uses default auth file paths", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "   " : null))
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer config-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("supports uppercase 0X-prefixed keychain hex payload", async () => {
    const ctx = makeCtx()
    const raw = JSON.stringify({
      tokens: { access_token: "hex-token" },
      last_refresh: new Date().toISOString(),
    })
    const hex = "0X" + Buffer.from(raw, "utf8").toString("hex").toUpperCase()
    ctx.host.keychain.readGenericPassword.mockReturnValue(hex)
    const originalTextDecoder = globalThis.TextDecoder
    // Force fallback decode path used in hosts without TextDecoder.
    globalThis.TextDecoder = undefined
    try {
      ctx.host.http.request.mockImplementation((opts) => {
        expect(opts.headers.Authorization).toBe("Bearer hex-token")
        return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
      })
      const plugin = await loadPlugin()
      plugin.probe(ctx)
    } finally {
      globalThis.TextDecoder = originalTextDecoder
    }
  })

  it("throws token messages for refresh_token_expired and invalidated", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValueOnce({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_expired" } }),
    })
    let plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Session expired")

    ctx.host.http.request.mockReset()
    ctx.host.http.request.mockReturnValueOnce({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_invalidated" } }),
    })
    delete globalThis.__openusage_plugin
    vi.resetModules()
    plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token revoked")
  })

  it("falls back to existing token when refresh cannot produce new access token", async () => {
    const baseAuth = {
      tokens: { access_token: "existing", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }

    const runCase = async (refreshResp) => {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify(baseAuth))
      ctx.host.http.request.mockImplementation((opts) => {
        if (String(opts.url).includes("oauth/token")) return refreshResp
        expect(opts.headers.Authorization).toBe("Bearer existing")
        return {
          status: 200,
          headers: { "x-codex-primary-used-percent": "5" },
          bodyText: JSON.stringify({}),
        }
      })

      delete globalThis.__openusage_plugin
      vi.resetModules()
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    }

    await runCase({ status: 500, headers: {}, bodyText: "" })
    await runCase({ status: 200, headers: {}, bodyText: "not-json" })
    await runCase({ status: 200, headers: {}, bodyText: JSON.stringify({}) })
  })

  it("throws when refresh body is malformed and auth endpoint is unauthorized", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValue({
      status: 401,
      headers: {},
      bodyText: "{bad",
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("uses no_runner when ccusage host API is unavailable", async () => {
    const ctx = makeCtx()
    ctx.host.ccusage = null
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Today")).toBeUndefined()
  })

  it("handles malformed ccusage result payload as runner_failed", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "ok", data: {} })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Today")).toBeUndefined()
  })

  it("formats large token totals using compact units", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-12-15T12:00:00.000Z"))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })

      const now = new Date()
      const month = now.toLocaleString("en-US", { month: "short" })
      const day = String(now.getDate()).padStart(2, "0")
      const year = now.getFullYear()
      const todayKey = month + " " + day + ", " + year
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: {
          daily: [
            { date: todayKey, totalTokens: 1_250_000, totalCost: 12.5 },
            { date: "20261214", totalTokens: 25_000_000, costUSD: 50.0 },
            { date: "bad-date", totalTokens: "n/a", costUSD: "n/a" },
          ],
        },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const today = result.lines.find((line) => line.label === "Today")
      const last30 = result.lines.find((line) => line.label === "Last 30 Days")
      expect(today && today.value).toContain("1.3M tokens")
      expect(last30 && last30.value).toContain("26M tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("handles non-string retry wrapper exceptions", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.util.retryOnceOnAuth = () => {
      throw new Error("boom")
    }

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed. Check your connection.")
  })

  it("treats empty auth file payload as not logged in", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", "")
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("handles missing keychain read API", async () => {
    const ctx = makeCtx()
    ctx.host.keychain = {}
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("ignores keychain payloads that are present but missing token-like auth", async () => {
    const ctx = makeCtx()
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({ user: "me" }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("stores refresh and id tokens when refresh response includes them", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))

    const idToken = "header.payload.signature"
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("oauth/token")) {
        return {
          status: 200,
          headers: {},
          bodyText: JSON.stringify({
            access_token: "new-token",
            refresh_token: "new-refresh",
            id_token: idToken,
          }),
        }
      }
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "1" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    const saved = JSON.parse(ctx.host.fs.readText("~/.codex/auth.json"))
    expect(saved.tokens.refresh_token).toBe("new-refresh")
    expect(saved.tokens.id_token).toBe(idToken)
  })
})
