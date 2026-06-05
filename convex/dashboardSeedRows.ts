type SeedSample = {
  metricKey: string
  value: number
  unit: string
  source: "providerReported" | "normalized" | "estimated"
  dayOffset: number
}

const HISTORY_MULTIPLIERS = [0.78, 1.15, 0.86, 1.24, 0.72, 1.33, 0.97]

type SeedProvider = {
  providerId: string
  summary: Record<string, unknown>
  metricFamilies: string[]
  samples: SeedSample[]
}

type SeedDevice = {
  slug: string
  name: string
  os: string
  appVersion: string
  status: "connected" | "stale" | "disconnected" | "archived"
  createdOffsetMs: number
  lastSeenOffsetMs: number
  lastSyncOffsetMs: number | null
}

export type SeedDeveloper = {
  slug: string
  name: string
  status: "active" | "inactive"
  metadataNotes?: string
  hasToken: boolean
  tokenStatus: "active" | "revoked"
  offsetMs: number
  devices: SeedDevice[]
  reportingDeviceSlug: string
  providers: SeedProvider[]
}

export function seedDevelopers(now: number): SeedDeveloper[] {
  return [
    {
      slug: "avery",
      name: "Avery",
      status: "active",
      metadataNotes: "Seed: full data, active token, two devices.",
      hasToken: true,
      tokenStatus: "active",
      offsetMs: 2 * 60 * 1000,
      devices: [
        device("mac", "Avery MacBook", "macos", "connected", 2),
        device("win", "Avery Windows rig", "windows", "stale", 72 * 60),
      ],
      reportingDeviceSlug: "mac",
      providers: [
        cursorProvider(420_000, 18.4, 58, now),
        codexProvider(180_000, 7.2, 35, 62, 20),
        claudeProvider(140_000, 6.4, 48, 66, 12),
        jetBrainsProvider(96_000, 4.8, 82, 210, 44),
      ],
    },
    {
      slug: "morgan",
      name: "Morgan",
      status: "active",
      hasToken: true,
      tokenStatus: "active",
      offsetMs: 8 * 60 * 1000,
      devices: [
        device("studio", "Morgan Studio Mac", "macos", "connected", 8),
        device("thinkpad", "Morgan ThinkPad", "windows", "connected", 18),
        device("linux", "Morgan Linux box", "linux", "stale", 140),
        device("old-air", "Morgan old Air", "macos", "archived", 9_000),
        device("vm", "Morgan Windows VM", "windows", "disconnected", 1_500),
      ],
      reportingDeviceSlug: "studio",
      providers: [
        cursorProvider(280_000, 11.1, 72, now),
        codexProvider(220_000, 8.8, 55, 74, 30),
        claudeProvider(130_000, 5.6, 78, 88, 18),
        jetBrainsProvider(74_000, 3.9, 61, 170, 36),
      ],
    },
    {
      slug: "riley",
      name: "Riley",
      status: "active",
      hasToken: false,
      tokenStatus: "active",
      offsetMs: 14 * 60 * 1000,
      devices: [
        device("desktop", "Riley Desktop", "windows", "connected", 14),
        device("mac", "Riley Mac", "macos", "connected", 28),
        device("jetbrains-laptop", "Riley JetBrains laptop", "linux", "stale", 300),
        device("lab", "Riley Lab machine", "windows", "disconnected", 800),
        device("old", "Riley old Mac", "macos", "archived", 12_000),
      ],
      reportingDeviceSlug: "desktop",
      providers: [
        cursorProvider(190_000, 8.4, 42, now),
        jetBrainsProvider(160_000, 7.8, 91, 340, 72),
      ],
    },
    {
      slug: "casey",
      name: "Casey",
      status: "active",
      metadataNotes: "Seed: Codex-only developer.",
      hasToken: true,
      tokenStatus: "active",
      offsetMs: 22 * 60 * 1000,
      devices: [
        device("mini", "Casey Mac mini", "macos", "connected", 22),
        device("surface", "Casey Surface", "windows", "stale", 500),
      ],
      reportingDeviceSlug: "mini",
      providers: [codexProvider(90_000, 3.4, 20, 38, 12)],
    },
    {
      slug: "taylor",
      name: "Taylor",
      status: "active",
      hasToken: false,
      tokenStatus: "active",
      offsetMs: 35 * 60 * 1000,
      devices: [device("linux", "Taylor Linux workstation", "linux", "stale", 35)],
      reportingDeviceSlug: "linux",
      providers: [
        claudeProvider(240_000, 10.7, 84, 92, 34),
        jetBrainsProvider(120_000, 5.1, 48, 150, 28),
      ],
    },
    {
      slug: "jamie",
      name: "Jamie",
      status: "active",
      metadataNotes: "Seed: revoked token, still has old synced usage.",
      hasToken: true,
      tokenStatus: "revoked",
      offsetMs: 50 * 60 * 1000,
      devices: [
        device("mac", "Jamie Mac", "macos", "disconnected", 50),
        device("win", "Jamie Windows", "windows", "stale", 620),
        device("old", "Jamie archived laptop", "windows", "archived", 8_500),
      ],
      reportingDeviceSlug: "mac",
      providers: [
        cursorProvider(80_000, 2.9, 30, now),
        codexProvider(125_000, 4.6, 44, 57, 25),
        claudeProvider(70_000, 2.8, 36, 49, 8),
      ],
    },
    {
      slug: "quinn",
      name: "Quinn",
      status: "inactive",
      hasToken: true,
      tokenStatus: "active",
      offsetMs: 5 * 24 * 60 * 60 * 1000,
      devices: [device("home", "Quinn home laptop", "macos", "connected", 5 * 24 * 60)],
      reportingDeviceSlug: "home",
      providers: [],
    },
  ]
}

function device(
  slug: string,
  name: string,
  os: string,
  status: SeedDevice["status"],
  lastSeenMinutesAgo: number
): SeedDevice {
  const lastSeenOffsetMs = lastSeenMinutesAgo * 60 * 1000
  return {
    slug,
    name,
    os,
    appVersion: status === "archived" ? "0.6.20-local" : "0.6.27-local",
    status,
    createdOffsetMs: Math.max(lastSeenOffsetMs + 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000),
    lastSeenOffsetMs,
    lastSyncOffsetMs: status === "connected" || status === "stale" ? lastSeenOffsetMs : null,
  }
}

function cursorProvider(
  tokensTotal: number,
  estimatedCostUsd: number,
  percent: number,
  now: number
) {
  return {
    providerId: "cursor",
    summary: {
      tokensTotal,
      estimatedCostUsd,
      quotaPercent: percent,
      provider: {
        cursor: {
          planTotalPercentUsed: percent,
          autoPercentUsed: Math.max(8, percent - 18),
          apiPercentUsed: Math.min(96, percent + 12),
          pooledUsedUsd: 320,
          pooledLimitUsd: 800,
          pooledRemainingUsd: 480,
          resetAt: now + 12 * 24 * 60 * 60 * 1000,
        },
      },
    },
    metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "cursorPool"],
    samples: [
      ...historySamples("cursor.tokens.total", tokensTotal, "tokens"),
      ...historySamples("cursor.cost.estimated", estimatedCostUsd, "usd", "estimated"),
      sample("cursor.plan.percentUsed", percent, "percent"),
      sample("cursor.auto.percentUsed", Math.max(8, percent - 18), "percent"),
      sample("cursor.api.percentUsed", Math.min(96, percent + 12), "percent"),
    ],
  }
}

function codexProvider(
  tokensTotal: number,
  estimatedCostUsd: number,
  sessionPercent: number,
  weeklyPercent: number,
  reviewPercent: number
) {
  return {
    providerId: "codex",
    summary: {
      tokensTotal,
      estimatedCostUsd,
      quotaPercent: Math.max(sessionPercent, weeklyPercent, reviewPercent),
      creditsRemaining: 6,
      provider: {
        codex: {
          planName: "Plus",
          sessionUsedPercent: sessionPercent,
          weeklyUsedPercent: weeklyPercent,
          reviewUsedPercent: reviewPercent,
          todayTokens: tokensTotal,
        },
      },
    },
    metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "credits"],
    samples: [
      ...historySamples("codex.tokens.total", tokensTotal, "tokens"),
      ...historySamples("codex.cost.estimated", estimatedCostUsd, "usd", "estimated"),
      sample("codex.session.percentUsed", sessionPercent, "percent"),
      sample("codex.weekly.percentUsed", weeklyPercent, "percent"),
      sample("codex.reviews.percentUsed", reviewPercent, "percent"),
    ],
  }
}

function claudeProvider(
  tokensTotal: number,
  estimatedCostUsd: number,
  sessionPercent: number,
  weeklyPercent: number,
  creditsUsed: number
) {
  return {
    providerId: "claude",
    summary: {
      tokensTotal,
      estimatedCostUsd,
      quotaPercent: Math.max(sessionPercent, weeklyPercent),
      budgetUsedUsd: creditsUsed,
      budgetLimitUsd: 100,
      creditsUsed,
      provider: {
        claude: {
          planName: "Pro",
          sessionUsedPercent: sessionPercent,
          weeklyUsedPercent: weeklyPercent,
          extraUsageUsedUsd: creditsUsed,
          extraUsageMonthlyLimitUsd: 100,
          todayTokens: tokensTotal,
          todayEstimatedCostUsd: estimatedCostUsd,
        },
      },
    },
    metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "budget", "credits"],
    samples: [
      ...historySamples("claude.tokens.total", tokensTotal, "tokens"),
      ...historySamples("claude.cost.estimated", estimatedCostUsd, "usd", "estimated"),
      sample("claude.session.percentUsed", sessionPercent, "percent"),
      sample("claude.weekly.percentUsed", weeklyPercent, "percent"),
    ],
  }
}

function jetBrainsProvider(
  tokensTotal: number,
  estimatedCostUsd: number,
  quotaPercent: number,
  quotaUsed: number,
  creditsUsed: number
) {
  return {
    providerId: "jetbrains-ai-assistant",
    summary: {
      tokensTotal,
      quotaPercent,
      creditsUsed,
      creditsRemaining: 500 - quotaUsed,
      estimatedCostUsd,
      provider: {
        "jetbrains-ai-assistant": {
          quotaUsed,
          quotaLimit: 500,
          quotaRemaining: 500 - quotaUsed,
          quotaUsedPercent: quotaPercent,
          quotaUnit: "credits",
        },
      },
    },
    metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "credits"],
    samples: [
      ...historySamples("jetbrains-ai-assistant.tokens.total", tokensTotal, "tokens"),
      ...historySamples("jetbrains-ai-assistant.cost.estimated", estimatedCostUsd, "usd", "estimated"),
      sample("jetbrains-ai-assistant.credits.used", creditsUsed, "credits"),
      sample("jetbrains-ai-assistant.quota.percentUsed", quotaPercent, "percent"),
    ],
  }
}

function historySamples(
  metricKey: string,
  latestValue: number,
  unit: string,
  source: "providerReported" | "normalized" | "estimated" = "providerReported"
) {
  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = index - 6
    const scale = HISTORY_MULTIPLIERS[index] * metricOffset(metricKey)
    return sample(metricKey, Math.round(latestValue * scale * 100) / 100, unit, source, dayOffset)
  })
}

function metricOffset(metricKey: string) {
  const hash = [...metricKey].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 1 + (hash % 9 - 4) / 100
}

function sample(
  metricKey: string,
  value: number,
  unit: string,
  source: "providerReported" | "normalized" | "estimated" = "providerReported",
  dayOffset = 0
) {
  return { metricKey, value, unit, source, dayOffset }
}
