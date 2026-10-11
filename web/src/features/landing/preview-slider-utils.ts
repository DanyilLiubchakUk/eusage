import { formatCount, formatUsd } from "../dashboard/dashboard-formatting"

export const PREVIEW_SLIDER_FOLLOW_MS = 220
export const PREVIEW_TRACK_HIT_PAD_PX = 10

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function ratioFromClientX(rect: DOMRect, clientX: number) {
  if (rect.width <= 0) return 0
  return clamp01((clientX - rect.left) / rect.width)
}

/** ponytail: ease-out-back approximates tilt card spring reset */
export function springEaseOutBack(t: number, intensity: number) {
  const c1 = 1.2 + intensity * 1.1
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

export function springResetDurationMs(from: number, to: number) {
  const intensity = clamp01(Math.abs(from - to))
  return 400 + intensity * 650
}

export type PreviewSliderTrack = {
  id: string
  defaultRatio: number
  kind: "cursor-pool" | "provider"
  providerId?: string
  baselineTokens: number
  baselineCostUsd: number
}

export type PreviewSliderConfig = {
  tracks: PreviewSliderTrack[]
  cursorLimitUsd: number
  maxProviderTokens: number
}

export type PreviewSliderRatios = Record<string, number>

export function defaultPreviewRatios(tracks: PreviewSliderTrack[]): PreviewSliderRatios {
  return Object.fromEntries(tracks.map((track) => [track.id, track.defaultRatio]))
}

export type PreviewSliderDisplay = {
  tokensTotal: number
  estimatedCostUsd: number
  cursorUsedUsd: number
  cursorRemainingUsd: number
  cursorUsedPct: number
  cursorBudgetLabel: string
  topProvider: { providerId: string; tokens: number } | null
  nextProvider: { providerId: string; tokens: number } | null
  providerRows: Array<{
    providerId: string
    tokens: number
    barPct: number
    label: string
  }>
}

export function derivePreviewSliderDisplay(
  config: PreviewSliderConfig,
  ratios: PreviewSliderRatios
): PreviewSliderDisplay {
  const providerRows = config.tracks
    .filter((track) => track.kind === "provider" && track.providerId)
    .map((track) => {
      const ratio = ratios[track.id] ?? track.defaultRatio
      const tokens = ratio * config.maxProviderTokens
      const scale = track.defaultRatio > 0 ? ratio / track.defaultRatio : 1
      return {
        providerId: track.providerId!,
        tokens,
        barPct: Math.round(ratio * 100),
        label: formatCount(tokens),
        costUsd: track.baselineCostUsd * scale,
      }
    })

  const cursorTrack = config.tracks.find((track) => track.kind === "cursor-pool")
  const cursorRatio = cursorTrack ? (ratios[cursorTrack.id] ?? cursorTrack.defaultRatio) : 0
  const cursorUsedUsd = cursorRatio * config.cursorLimitUsd
  const cursorRemainingUsd = Math.max(0, config.cursorLimitUsd - cursorUsedUsd)
  const cursorUsedPct = config.cursorLimitUsd > 0 ? Math.round(cursorRatio * 100) : 0

  const sorted = [...providerRows].sort((left, right) => right.tokens - left.tokens)
  const tokensTotal = providerRows.reduce((sum, row) => sum + row.tokens, 0)
  const estimatedCostUsd = providerRows.reduce((sum, row) => sum + row.costUsd, 0)

  return {
    tokensTotal,
    estimatedCostUsd,
    cursorUsedUsd,
    cursorRemainingUsd,
    cursorUsedPct,
    cursorBudgetLabel: `$${Math.round(cursorUsedUsd)} / $${Math.round(config.cursorLimitUsd)}`,
    topProvider: sorted[0]
      ? { providerId: sorted[0].providerId, tokens: sorted[0].tokens }
      : null,
    nextProvider: sorted[1]
      ? { providerId: sorted[1].providerId, tokens: sorted[1].tokens }
      : null,
    providerRows: providerRows.map(({ providerId, tokens, barPct, label }) => ({
      providerId,
      tokens,
      barPct,
      label,
    })),
  }
}

export function buildPreviewSliderConfig(args: {
  cursorLimitUsd: number
  cursorUsedUsd: number
  providerRows: Array<{ providerId: string; value: number; label: string }>
  providerCostsUsd: Record<string, number>
}): PreviewSliderConfig {
  const maxProviderTokens =
    args.providerRows.reduce((max, row) => Math.max(max, row.value), 0) || 1

  const tracks: PreviewSliderTrack[] = []

  if (args.cursorLimitUsd > 0) {
    tracks.push({
      id: "cursor-pool",
      kind: "cursor-pool",
      defaultRatio: clamp01(args.cursorUsedUsd / args.cursorLimitUsd),
      baselineTokens: 0,
      baselineCostUsd: 0,
    })
  }

  for (const row of args.providerRows) {
    tracks.push({
      id: `provider-${row.providerId}`,
      kind: "provider",
      providerId: row.providerId,
      defaultRatio: clamp01(row.value / maxProviderTokens),
      baselineTokens: row.value,
      baselineCostUsd: args.providerCostsUsd[row.providerId] ?? 0,
    })
  }

  return { tracks, cursorLimitUsd: args.cursorLimitUsd, maxProviderTokens }
}

/** ponytail: smallest check that ratio + derive math stay sane */
export function previewSliderUtilsSelfCheck() {
  const config = buildPreviewSliderConfig({
    cursorLimitUsd: 480,
    cursorUsedUsd: 317.4,
    providerRows: [
      { providerId: "cursor", value: 4_080_000_000, label: "4.08 B" },
      { providerId: "codex", value: 3_520_000_000, label: "3.52 B" },
    ],
    providerCostsUsd: { cursor: 10_000, codex: 8_000 },
  })
  const defaults = defaultPreviewRatios(config.tracks)
  const baseline = derivePreviewSliderDisplay(config, defaults)
  console.assert(baseline.cursorUsedPct === 66, "cursor pct baseline")
  console.assert(baseline.topProvider?.providerId === "cursor", "cursor leads baseline")
  const scrubbed = derivePreviewSliderDisplay(config, {
    ...defaults,
    "provider-cursor": 0.75,
    "provider-codex": 1,
  })
  if (scrubbed.topProvider?.providerId !== "codex") {
    throw new Error("scrub flips top provider")
  }
  console.assert(formatUsd(baseline.estimatedCostUsd).startsWith("$"), "cost formats")
}
