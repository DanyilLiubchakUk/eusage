(function () {
  var PROVIDER_ID = "jetbrains-ai-assistant"
  var SUMMARY_VERSION = "1.0.0"
  var EXTRACTOR_VERSION = "1.0.0"
  var QUOTA_FILENAME = "AIAssistantQuotaManager2.xml"
  var REDACTED_VALUE = "[REDACTED]"

  var CREDIT_UNIT_SCALE = 100000

  var PRODUCT_PREFIXES = [
    "Aqua", "AndroidStudio", "CLion", "DataGrip", "DataSpell", "GoLand", "IdeaIC",
    "IntelliJIdea", "IntelliJIdeaCE", "PhpStorm", "PyCharm", "PyCharmCE", "Rider",
    "RubyMine", "RustRover", "WebStorm", "Writerside",
  ]

  function platformBaseDirs(platform) {
    var p = String(platform || "").toLowerCase()
    if (p === "macos" || p === "darwin") return ["~/Library/Application Support/JetBrains"]
    if (p === "linux") return ["~/.config/JetBrains"]
    if (p === "windows" || p === "win32") return ["~/AppData/Roaming/JetBrains"]
    return ["~/Library/Application Support/JetBrains", "~/.config/JetBrains", "~/AppData/Roaming/JetBrains"]
  }

  function isLikelyIdeDirName(name) {
    if (typeof name !== "string") return false
    var trimmed = name.trim()
    if (!trimmed) return false
    var hasPrefix = false
    for (var i = 0; i < PRODUCT_PREFIXES.length; i += 1) {
      if (trimmed.indexOf(PRODUCT_PREFIXES[i]) === 0) {
        hasPrefix = true
        break
      }
    }
    if (!hasPrefix) return false
    return /\d{4}\.\d/.test(trimmed)
  }

  function safeListDir(ctx, path) {
    if (
      !ctx.host.fs ||
      typeof ctx.host.fs.listDir !== "function" ||
      !ctx.host.fs.exists(path)
    ) {
      return []
    }

    try {
      var entries = ctx.host.fs.listDir(path)
      return Array.isArray(entries) ? entries : []
    } catch (e) {
      ctx.host.log.warn("listDir failed for " + path + ": " + String(e))
      return []
    }
  }

  function buildQuotaPaths(ctx) {
    var bases = platformBaseDirs(ctx.app.platform)
    var paths = []
    var seen = Object.create(null)
    for (var b = 0; b < bases.length; b += 1) {
      var base = bases[b]
      var entries = safeListDir(ctx, base)
      for (var i = 0; i < entries.length; i += 1) {
        var dirName = entries[i]
        if (!isLikelyIdeDirName(dirName)) continue
        var quotaPath = base + "/" + dirName + "/options/" + QUOTA_FILENAME
        if (!ctx.host.fs.exists(quotaPath)) continue
        if (!seen[quotaPath]) {
          seen[quotaPath] = true
          paths.push(quotaPath)
        }
      }
    }
    return paths
  }

  function decodeXmlEntities(text) {
    if (!text) return ""
    return String(text)
      .replace(/&#10;/g, "\n")
      .replace(/&#13;/g, "\r")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
  }

  function parseOptionJson(ctx, xml, optionName) {
    var elemMatch = xml.match(new RegExp('<option\\b[^>]*\\bname="' + optionName + '"[^>]*/>'))
    if (!elemMatch) return null
    var valueMatch = elemMatch[0].match(/\bvalue="([^"]*)"/)
    if (!valueMatch) return null
    return ctx.util.tryParseJson(decodeXmlEntities(valueMatch[1]))
  }

  function toNumber(value) {
    var n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  function clamp(value, min, max) {
    if (value < min) return min
    if (value > max) return max
    return value
  }

  function normalizeQuota(quotaInfo) {
    if (!quotaInfo || typeof quotaInfo !== "object") return null

    var maximum = toNumber(quotaInfo.maximum)
    var used = toNumber(quotaInfo.current)
    var remaining = toNumber(quotaInfo.available)
    if (maximum === null) maximum = quotaBucketSum(quotaInfo, "maximum")
    if (used === null) used = quotaBucketSum(quotaInfo, "current")
    if (remaining === null) remaining = quotaBucketSum(quotaInfo, "available")
    if (remaining === null && maximum !== null && used !== null) remaining = maximum - used

    if (maximum === null || maximum <= 0 || used === null) return null

    used = clamp(used, 0, maximum)
    if (remaining !== null) remaining = clamp(remaining, 0, maximum)

    return {
      used: used,
      maximum: maximum,
      remaining: remaining,
      until: quotaInfo.until || null,
    }
  }

  function quotaBucketSum(quotaInfo, key) {
    var tariff = quotaInfo.tariffQuota && typeof quotaInfo.tariffQuota === "object" ? quotaInfo.tariffQuota : null
    var topUp = quotaInfo.topUpQuota && typeof quotaInfo.topUpQuota === "object" ? quotaInfo.topUpQuota : null
    var tariffValue = tariff ? toNumber(tariff[key]) : null
    var topUpValue = topUp ? toNumber(topUp[key]) : null
    return tariffValue !== null || topUpValue !== null ? (tariffValue || 0) + (topUpValue || 0) : null
  }

  function readQuotaState(ctx, path) {
    if (!ctx.host.fs.exists(path)) return null
    try {
      var xml = ctx.host.fs.readText(path)
      var quotaInfo = parseOptionJson(ctx, xml, "quotaInfo")
      var nextRefill = parseOptionJson(ctx, xml, "nextRefill")
      var quota = normalizeQuota(quotaInfo)
      if (!quota) return null
      return { path: path, quota: quota, quotaInfo: quotaInfo, nextRefill: nextRefill }
    } catch (e) {
      ctx.host.log.warn("failed reading quota state " + path + ": " + String(e))
      return null
    }
  }

  function parseIsoDurationMs(value) {
    if (typeof value !== "string" || !value) return null

    var h = value.match(/^PT(\d+)H$/)
    if (h) return Number(h[1]) * 60 * 60 * 1000

    var d = value.match(/^P(\d+)D$/)
    if (d) return Number(d[1]) * 24 * 60 * 60 * 1000

    var w = value.match(/^P(\d+)W$/)
    if (w) return Number(w[1]) * 7 * 24 * 60 * 60 * 1000

    return null
  }

  function pickBestState(ctx, states) {
    var best = null
    var bestMs = -Infinity

    for (var i = 0; i < states.length; i += 1) {
      var state = states[i]
      var untilMs = stateWindowMs(ctx, state)
      if (shouldPreferState(state, best, untilMs, bestMs)) {
        best = state
        bestMs = untilMs
      }
    }
    return best
  }

  function stateWindowMs(ctx, state) {
    var untilMs = state.quota.until ? ctx.util.parseDateMs(state.quota.until) : null
    if (untilMs === null && state.nextRefill && state.nextRefill.next) untilMs = ctx.util.parseDateMs(state.nextRefill.next)
    return untilMs === null ? -Infinity : untilMs
  }

  function shouldPreferState(state, best, untilMs, bestMs) {
    if (!best || untilMs > bestMs) return true
    if (untilMs !== bestMs) return false
    var currentRatio = state.quota.maximum > 0 ? state.quota.used / state.quota.maximum : 0
    var bestRatio = best.quota.maximum > 0 ? best.quota.used / best.quota.maximum : 0
    return currentRatio > bestRatio || (currentRatio === bestRatio && state.quota.used > best.quota.used)
  }

  function formatDecimal(value, places) {
    if (!Number.isFinite(value)) return null
    var factor = Math.pow(10, places)
    var rounded = Math.round(value * factor) / factor
    return rounded.toFixed(places).replace(/\.?0+$/, "")
  }

  function detectDisplayScale(quota, nextRefill) {
    var maxAbs = Math.max(
      Math.abs(quota.maximum || 0),
      Math.abs(quota.used || 0),
      Math.abs(quota.remaining || 0)
    )

    if (nextRefill && nextRefill.tariff && typeof nextRefill.tariff === "object") {
      var tariffAmount = toNumber(nextRefill.tariff.amount)
      if (tariffAmount !== null) {
        maxAbs = Math.max(maxAbs, Math.abs(tariffAmount))
      }
    }

    if (maxAbs >= CREDIT_UNIT_SCALE) return CREDIT_UNIT_SCALE
    return 1
  }

  function dayFromMs(ms) { return new Date(ms).toISOString().slice(0, 10) }

  function sampleDay(ctx) {
    var ms = ctx.util.parseDateMs(ctx.nowIso)
    return dayFromMs(ms === null ? Date.now() : ms)
  }

  function setNumber(target, key, value) {
    var n = toNumber(value)
    if (n !== null) target[key] = n
  }

  function scaled(value, scale) {
    var n = toNumber(value)
    return n === null ? null : n / scale
  }

  function addMetricSample(samples, metricKey, value, unit, day, period) {
    var n = toNumber(value)
    if (n === null) return
    var sample = { metricKey: metricKey, value: n, unit: unit, sampleDay: day, source: "providerReported" }
    if (period.start !== null) sample.periodStart = period.start
    if (period.end !== null) sample.periodEnd = period.end
    samples.push(sample)
  }

  function quotaPeriod(ctx, resetIso, durationMs, day) {
    var end = ctx.util.parseDateMs(resetIso)
    var start = end !== null && durationMs ? end - durationMs : null
    return { start: start, end: end, key: end === null ? PROVIDER_ID + ":" + day : PROVIDER_ID + ":quota:" + dayFromMs(end) }
  }

  function extractorVersion() { var version = {}; version[PROVIDER_ID] = EXTRACTOR_VERSION; return version }

  function metricFamilies(summary) {
    var families = []
    if (summary.quotaPercent !== undefined) families.push("quotaPressure")
    if (summary.creditsUsed !== undefined || summary.creditsRemaining !== undefined) families.push("credits")
    return families.length > 0 ? families : ["jetbrainsQuota"]
  }

  function buildSourceFacts(ctx, chosen, scale, usedPercent, resetIso, durationMs) {
    var day = sampleDay(ctx)
    var period = quotaPeriod(ctx, resetIso, durationMs, day)
    var quota = chosen.quota
    var used = scaled(quota.used, scale)
    var limit = scaled(quota.maximum, scale)
    var remaining = scaled(quota.remaining, scale)
    var jetbrains = { quotaUnit: scale > 1 ? "credits" : "raw" }
    setNumber(jetbrains, "quotaUsed", used)
    setNumber(jetbrains, "quotaLimit", limit)
    setNumber(jetbrains, "quotaRemaining", remaining)
    setNumber(jetbrains, "quotaUsedRaw", quota.used)
    setNumber(jetbrains, "quotaLimitRaw", quota.maximum)
    setNumber(jetbrains, "quotaRemainingRaw", quota.remaining)
    setNumber(jetbrains, "quotaUsedPercent", usedPercent)
    setNumber(jetbrains, "quotaResetAt", period.end)
    if (durationMs) jetbrains.quotaPeriodSeconds = durationMs / 1000
    if (scale > 1) jetbrains.quotaScale = scale

    var provider = {}
    provider[PROVIDER_ID] = jetbrains
    var summary = { provider: provider }
    setNumber(summary, "quotaPercent", usedPercent)
    setNumber(summary, "creditsUsed", used)
    setNumber(summary, "creditsRemaining", remaining)

    var samples = []
    var metrics = [["used", used, "credits"], ["limit", limit, "credits"], ["remaining", remaining, "credits"], ["percentUsed", usedPercent, "percent"]]
    for (var i = 0; i < metrics.length; i += 1) {
      addMetricSample(samples, PROVIDER_ID + ".quota." + metrics[i][0], metrics[i][1], metrics[i][2], day, period)
    }

    return { periodStart: period.start, periodEnd: period.end, periodKey: period.key, dataIdentity: period.key, summary: summary, summaryVersion: SUMMARY_VERSION, extractorVersion: extractorVersion(), metricFamilies: metricFamilies(summary), metricSamples: samples }
  }

  function buildRawPayload(chosen) {
    return { quotaInfo: redactPayloadValue(chosen.quotaInfo || {}), nextRefill: redactPayloadValue(chosen.nextRefill || null), source: { ideDirectory: ideDirFromPath(chosen.path), quotaFile: QUOTA_FILENAME } }
  }

  function ideDirFromPath(path) {
    var parts = String(path || "").split("/")
    var idx = parts.indexOf("options")
    return idx > 0 ? parts[idx - 1] : null
  }

  function redactPayloadValue(value) {
    if (Array.isArray(value)) return value.map(redactPayloadValue)
    if (!value || typeof value !== "object") return value
    var out = {}
    for (var key in value) {
      out[key] = isSensitivePayloadKey(key) ? REDACTED_VALUE : redactPayloadValue(value[key])
    }
    return out
  }

  function isSensitivePayloadKey(key) {
    var normalized = String(key || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    return normalized === "token" || normalized === "accesstoken" || normalized === "refreshtoken" ||
      normalized === "secret" || normalized === "apikey" || normalized === "authorization" ||
      normalized === "password" || normalized === "cookie" || /token$|secret$|password$|credential$/.test(normalized)
  }

  function probe(ctx) {
    var paths = buildQuotaPaths(ctx)
    var states = []

    for (var i = 0; i < paths.length; i += 1) {
      var state = readQuotaState(ctx, paths[i])
      if (state) states.push(state)
    }

    if (states.length === 0) {
      throw paths.length > 0
        ? "JetBrains AI Assistant quota data unavailable. Open AI Assistant once and try again."
        : "JetBrains AI Assistant not detected. Open a JetBrains IDE with AI Assistant enabled."
    }

    var chosen = pickBestState(ctx, states)
    var quota = chosen.quota
    var scale = detectDisplayScale(quota, chosen.nextRefill)
    var usedPercent = (quota.used / quota.maximum) * 100
    if (!Number.isFinite(usedPercent)) usedPercent = 0
    usedPercent = clamp(usedPercent, 0, 100)
    var line = { label: "Quota", used: usedPercent, limit: 100, format: { kind: "percent" } }

    var resetSource = (chosen.nextRefill && chosen.nextRefill.next) || quota.until || null
    var resetsAt = ctx.util.toIso(resetSource)
    if (resetsAt) line.resetsAt = resetsAt

    var refillTariff = chosen.nextRefill && chosen.nextRefill.tariff && typeof chosen.nextRefill.tariff === "object"
      ? chosen.nextRefill.tariff
      : null
    var duration = refillTariff ? parseIsoDurationMs(refillTariff.duration) : null
    if (duration) line.periodDurationMs = duration

    var lines = [ctx.line.progress(line)]

    lines.push(
      ctx.line.text({
        label: "Used",
        value:
          scale > 1
            ? formatDecimal(quota.used / scale, 2) + " / " + formatDecimal(quota.maximum / scale, 2) + " credits"
            : String(quota.used),
      })
    )

    if (quota.remaining !== null) {
      lines.push(
        ctx.line.text({
          label: "Remaining",
          value: scale > 1 ? formatDecimal(quota.remaining / scale, 2) + " credits" : String(quota.remaining),
        })
      )
    }

    ctx.host.log.info("quota loaded from " + chosen.path)

    return {
      lines: lines,
      providerAccountDetections: [{
        providerId: PROVIDER_ID,
        providerName: "JetBrains AI Assistant",
        identityKind: "localProfilePath",
        identityValue: chosen.path,
        identityConfidence: "medium",
      }],
      sourceFacts: buildSourceFacts(ctx, chosen, scale, usedPercent, resetsAt, duration),
      rawPayload: buildRawPayload(chosen),
    }
  }

  globalThis.__openusage_plugin = { id: PROVIDER_ID, probe: probe }
})()
