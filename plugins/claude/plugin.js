(function () {
  const PROVIDER_ID = "claude"
  const PROVIDER_NAME = "Claude"
  const DEFAULT_CLAUDE_HOME = "~/.claude"
  const EPORT_ACCOUNTS_DIR = "eport-accounts"
  const EPORT_SYNTHETIC_PROJECT_DIR = "eport-cursor-proxy"
  const CRED_FILE_NAME = ".credentials.json"
  const KEYCHAIN_SERVICE_PREFIX = "Claude Code"
  const PROD_BASE_API_URL = "https://api.anthropic.com"
  const PROD_REFRESH_URL = "https://platform.claude.com/v1/oauth/token"
  const PROD_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
  const NON_PROD_CLIENT_ID = "22422756-60c9-4084-8eb7-27705fd5cf9a"
  const SCOPES =
    "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload"
  const REFRESH_BUFFER_MS = 5 * 60 * 1000 // refresh 5 minutes before expiration
  const SUMMARY_VERSION = "1.0.0"
  const CLAUDE_EXTRACTOR_VERSION = "1.0.0"
  const REDACTED_VALUE = "[REDACTED]"
  const DEFAULT_REPORTING_TIME_ZONE = "UTC"
  const PERIOD_SESSION_MS = 5 * 60 * 60 * 1000
  const PERIOD_WEEKLY_MS = 7 * 24 * 60 * 60 * 1000
  const MODEL_WINDOWS = [
    { key: "seven_day_sonnet", name: "Sonnet", segment: "sonnet" },
    { key: "seven_day_opus", name: "Opus", segment: "opus" },
    { key: "seven_day_omelette", name: "Claude Design", segment: "design" },
  ]

  // Rate-limit state persisted across probe() calls (module scope survives re-invocations).
  const MIN_USAGE_FETCH_INTERVAL_MS = 5 * 60 * 1000  // never poll more than once per 5 min
  const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5 * 60 * 1000 // fallback when no Retry-After header
  let rateLimitedUntilMs = 0  // epoch ms; 0 = not rate-limited
  let lastUsageFetchMs = 0    // epoch ms of the most-recent API attempt
  let cachedUsageData = null  // last successful API response body (parsed JSON)

  function joinPath(base, leaf) {
    return base.replace(/[\\/]+$/, "") + "/" + leaf
  }

  function utf8DecodeBytes(bytes) {
    // Prefer native TextDecoder when available (QuickJS may not expose it).
    if (typeof TextDecoder !== "undefined") {
      try {
        return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes))
      } catch {}
    }

    // Minimal UTF-8 decoder (replacement char on invalid sequences).
    let out = ""
    for (let i = 0; i < bytes.length; ) {
      const b0 = bytes[i] & 0xff
      if (b0 < 0x80) {
        out += String.fromCharCode(b0)
        i += 1
        continue
      }

      // 2-byte
      if (b0 >= 0xc2 && b0 <= 0xdf) {
        if (i + 1 >= bytes.length) {
          out += "\ufffd"
          break
        }
        const b1 = bytes[i + 1] & 0xff
        if ((b1 & 0xc0) !== 0x80) {
          out += "\ufffd"
          i += 1
          continue
        }
        const cp = ((b0 & 0x1f) << 6) | (b1 & 0x3f)
        out += String.fromCharCode(cp)
        i += 2
        continue
      }

      // 3-byte
      if (b0 >= 0xe0 && b0 <= 0xef) {
        if (i + 2 >= bytes.length) {
          out += "\ufffd"
          break
        }
        const b1 = bytes[i + 1] & 0xff
        const b2 = bytes[i + 2] & 0xff
        const validCont = (b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80
        const notOverlong = !(b0 === 0xe0 && b1 < 0xa0)
        const notSurrogate = !(b0 === 0xed && b1 >= 0xa0)
        if (!validCont || !notOverlong || !notSurrogate) {
          out += "\ufffd"
          i += 1
          continue
        }
        const cp = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f)
        out += String.fromCharCode(cp)
        i += 3
        continue
      }

      // 4-byte
      if (b0 >= 0xf0 && b0 <= 0xf4) {
        if (i + 3 >= bytes.length) {
          out += "\ufffd"
          break
        }
        const b1 = bytes[i + 1] & 0xff
        const b2 = bytes[i + 2] & 0xff
        const b3 = bytes[i + 3] & 0xff
        const validCont = (b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80 && (b3 & 0xc0) === 0x80
        const notOverlong = !(b0 === 0xf0 && b1 < 0x90)
        const notTooHigh = !(b0 === 0xf4 && b1 > 0x8f)
        if (!validCont || !notOverlong || !notTooHigh) {
          out += "\ufffd"
          i += 1
          continue
        }
        const cp =
          ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)
        const n = cp - 0x10000
        out += String.fromCharCode(0xd800 + ((n >> 10) & 0x3ff), 0xdc00 + (n & 0x3ff))
        i += 4
        continue
      }

      out += "\ufffd"
      i += 1
    }
    return out
  }

  function tryParseCredentialJSON(ctx, text) {
    if (!text) return null
    const parsed = ctx.util.tryParseJson(text)
    if (parsed) return parsed

    // Some macOS keychain items are returned by `security ... -w` as hex-encoded UTF-8 bytes.
    // Example prefix: "7b0a" ( "{\\n" ).
    // Support both plain hex and "0x..." forms.
    let hex = String(text).trim()
    if (hex.startsWith("0x") || hex.startsWith("0X")) hex = hex.slice(2)
    if (!hex || hex.length % 2 !== 0) return null
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null
    try {
      const bytes = []
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16))
      }
      const decoded = utf8DecodeBytes(bytes)
      const decodedParsed = ctx.util.tryParseJson(decoded)
      if (decodedParsed) return decodedParsed
    } catch {}

    return null
  }

  function readEnvText(ctx, name) {
    try {
      const value = ctx.host.env.get(name)
      if (value === null || value === undefined) return null
      const text = String(value).trim()
      return text || null
    } catch {
      return null
    }
  }

  function readEnvFlag(ctx, name) {
    const value = readEnvText(ctx, name)
    if (!value) return false
    const lower = value.toLowerCase()
    return lower !== "0" && lower !== "false" && lower !== "no" && lower !== "off"
  }

  function getClaudeHomePath(ctx) {
    return readEnvText(ctx, "CLAUDE_CONFIG_DIR") || DEFAULT_CLAUDE_HOME
  }

  function getClaudeHomeOverride(ctx) {
    return readEnvText(ctx, "CLAUDE_CONFIG_DIR")
  }

  function getClaudeCredentialsPath(ctx) {
    return getClaudeHomePath(ctx) + "/" + CRED_FILE_NAME
  }

  function isMacPlatform(ctx) {
    const platform = String((ctx.app && ctx.app.platform) || "").toLowerCase()
    return platform === "darwin" || platform === "macos"
  }

  function getOauthConfig(ctx) {
    let baseApiUrl = PROD_BASE_API_URL
    let refreshUrl = PROD_REFRESH_URL
    let clientId = PROD_CLIENT_ID
    let oauthFileSuffix = ""

    const isAntUser = readEnvText(ctx, "USER_TYPE") === "ant"
    if (isAntUser && readEnvFlag(ctx, "USE_LOCAL_OAUTH")) {
      const localApiBase = readEnvText(ctx, "CLAUDE_LOCAL_OAUTH_API_BASE")
      baseApiUrl = (localApiBase || "http://localhost:8000").replace(/\/+$/, "")
      refreshUrl = baseApiUrl + "/v1/oauth/token"
      clientId = NON_PROD_CLIENT_ID
      oauthFileSuffix = "-local-oauth"
    } else if (isAntUser && readEnvFlag(ctx, "USE_STAGING_OAUTH")) {
      baseApiUrl = "https://api-staging.anthropic.com"
      refreshUrl = "https://platform.staging.ant.dev/v1/oauth/token"
      clientId = NON_PROD_CLIENT_ID
      oauthFileSuffix = "-staging-oauth"
    }

    const customOauthBase = readEnvText(ctx, "CLAUDE_CODE_CUSTOM_OAUTH_URL")
    if (customOauthBase) {
      const base = customOauthBase.replace(/\/+$/, "")
      baseApiUrl = base
      refreshUrl = base + "/v1/oauth/token"
      oauthFileSuffix = "-custom-oauth"
    }

    const clientIdOverride = readEnvText(ctx, "CLAUDE_CODE_OAUTH_CLIENT_ID")
    if (clientIdOverride) {
      clientId = clientIdOverride
    }

    return {
      baseApiUrl: baseApiUrl,
      usageUrl: baseApiUrl + "/api/oauth/usage",
      refreshUrl: refreshUrl,
      clientId: clientId,
      oauthFileSuffix: oauthFileSuffix,
    }
  }

  function buildClaudeBaseKeychainService(ctx) {
    return KEYCHAIN_SERVICE_PREFIX + getOauthConfig(ctx).oauthFileSuffix + "-credentials"
  }

  function computeKeychainHashSuffix(ctx) {
    // Mirrors upstream Claude Code (decompiled from the binary):
    //   const suffix = !process.env.CLAUDE_CONFIG_DIR
    //     ? ""
    //     : "-" + sha256(CLAUDE_CONFIG_DIR.normalize("NFC")).slice(0, 8)
    // The hash is ONLY appended when CLAUDE_CONFIG_DIR is explicitly set;
    // when unset, upstream uses the legacy unhashed service name.
    const explicitConfigDir = readEnvText(ctx, "CLAUDE_CONFIG_DIR")
    if (!explicitConfigDir) return null
    const sha256Hex = ctx.host && ctx.host.crypto && ctx.host.crypto.sha256Hex
    if (typeof sha256Hex !== "function") return null
    // Match upstream's `.normalize("NFC")` exactly.
    const normalized =
      typeof explicitConfigDir.normalize === "function"
        ? explicitConfigDir.normalize("NFC")
        : explicitConfigDir
    const digest = sha256Hex(normalized)
    if (typeof digest !== "string" || digest.length < 8) return null
    return digest.slice(0, 8)
  }

  function getClaudeKeychainServiceCandidates(ctx) {
    const base = buildClaudeBaseKeychainService(ctx)
    const candidates = []
    const hash = computeKeychainHashSuffix(ctx)
    if (hash) candidates.push(base + "-" + hash)  // hashed (CLAUDE_CONFIG_DIR set)
    candidates.push(base)                          // legacy / default
    return candidates
  }

  function readKeychainCredentialText(ctx, service) {
    const keychain = ctx.host.keychain
    if (!keychain) return null

    if (typeof keychain.readGenericPasswordForCurrentUser === "function") {
      try {
        const value = keychain.readGenericPasswordForCurrentUser(service)
        if (value) {
          return { value, source: "keychain-current-user" }
        }
      } catch (e) {
        ctx.host.log.info("current-user keychain read failed, trying legacy lookup: " + String(e))
      }
    }

    if (typeof keychain.readGenericPassword !== "function") return null

    try {
      const value = keychain.readGenericPassword(service)
      if (value) {
        return { value, source: "keychain-legacy" }
      }
    } catch (e) {
      ctx.host.log.info("keychain read failed (may not exist): " + String(e))
    }

    return null
  }

  function loadFileCredentials(ctx) {
    const credFile = getClaudeCredentialsPath(ctx)
    if (ctx.host.fs.exists(credFile)) {
      try {
        const text = ctx.host.fs.readText(credFile)
        const parsed = tryParseCredentialJSON(ctx, text)
        if (parsed) {
          const oauth = parsed.claudeAiOauth
          if (oauth && oauth.accessToken) {
            ctx.host.log.info("credentials loaded from file")
            return { oauth, source: "file", fullData: parsed }
          }
        }
        ctx.host.log.warn("credentials file exists but no valid oauth data")
      } catch (e) {
        ctx.host.log.warn("credentials file read failed: " + String(e))
      }
    }

    return null
  }

  function loadKeychainCredentials(ctx) {
    // Iterate hashed-then-legacy service names.
    for (const service of getClaudeKeychainServiceCandidates(ctx)) {
      const keychainResult = readKeychainCredentialText(ctx, service)
      if (keychainResult && keychainResult.value) {
        const parsed = tryParseCredentialJSON(ctx, keychainResult.value)
        if (parsed) {
          const oauth = parsed.claudeAiOauth
          if (oauth && oauth.accessToken) {
            ctx.host.log.info("credentials loaded from keychain (service=" + service + ")")
            return { oauth, source: keychainResult.source, serviceName: service, fullData: parsed }
          }
        }
        ctx.host.log.warn("keychain has data for " + service + " but no valid oauth")
        // Continue: a stale legacy entry shouldn't shadow a valid hashed one.
      }
    }

    return null
  }

  function loadStoredCredentials(ctx, suppressMissingWarn) {
    if (isMacPlatform(ctx)) {
      // Recent Claude Code versions keep the current macOS session in Keychain and
      // can leave a stale credentials file behind, so Keychain must win when valid.
      const keychainCredentials = loadKeychainCredentials(ctx)
      if (keychainCredentials) return keychainCredentials
    }

    const fileCredentials = loadFileCredentials(ctx)
    if (fileCredentials) return fileCredentials

    if (!suppressMissingWarn) {
      ctx.host.log.warn("no credentials found")
    }
    return null
  }

  function loadCredentials(ctx) {
    const envAccessToken = readEnvText(ctx, "CLAUDE_CODE_OAUTH_TOKEN")
    const stored = loadStoredCredentials(ctx, !!envAccessToken)
    if (!envAccessToken) {
      return stored
    }

    const oauth = stored && stored.oauth ? Object.assign({}, stored.oauth) : {}
    oauth.accessToken = envAccessToken
    return {
      oauth: oauth,
      source: stored ? stored.source : null,
      serviceName: stored ? stored.serviceName : null,
      fullData: stored ? stored.fullData : null,
      inferenceOnly: true,
    }
  }

  function hasProfileScope(creds) {
    if (!creds || creds.inferenceOnly) {
      return false
    }
    const scopes = creds.oauth && creds.oauth.scopes
    if (Array.isArray(scopes) && scopes.length > 0) {
      return scopes.indexOf("user:profile") !== -1
    }
    return true
  }

  function providerAccountDetections(ctx, creds) {
    if (!creds) return []

    if (creds.source === "file") {
      return [{
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        identityKind: "localProfilePath",
        identityValue: getClaudeHomePath(ctx),
        identityConfidence: "medium",
      }]
    }

    if (creds.serviceName) {
      return [{
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        identityKind: "credentialSource",
        identityValue: creds.serviceName,
        identityConfidence: "medium",
      }]
    }

    if (creds.inferenceOnly) {
      return [{
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        identityKind: "credentialSource",
        identityValue: "env:CLAUDE_CODE_OAUTH_TOKEN",
        identityConfidence: "low",
      }]
    }

    return []
  }

  function saveCredentials(ctx, source, serviceName, fullData) {
    // MUST use minified JSON - macOS `security -w` hex-encodes values with newlines,
    // which Claude Code can't read back, causing it to invalidate the session.
    const text = JSON.stringify(fullData)
    if (source === "file") {
      try {
        ctx.host.fs.writeText(getClaudeCredentialsPath(ctx), text)
      } catch (e) {
        ctx.host.log.error("Failed to write Claude credentials file: " + String(e))
      }
      return
    }
    if (!serviceName) {
      ctx.host.log.error("Refusing keychain write: missing service name (source=" + source + ")")
      return
    }
    if (source === "keychain-current-user") {
      try {
        if (typeof ctx.host.keychain.writeGenericPasswordForCurrentUser === "function") {
          ctx.host.keychain.writeGenericPasswordForCurrentUser(serviceName, text)
        } else {
          ctx.host.keychain.writeGenericPassword(serviceName, text)
        }
      } catch (e) {
        ctx.host.log.error("Failed to write Claude credentials keychain: " + String(e))
      }
    } else if (source === "keychain-legacy" || source === "keychain") {
      try {
        ctx.host.keychain.writeGenericPassword(serviceName, text)
      } catch (e) {
        ctx.host.log.error("Failed to write Claude credentials keychain: " + String(e))
      }
    }
  }

  function needsRefresh(ctx, oauth, nowMs) {
    return ctx.util.needsRefreshByExpiry({
      nowMs,
      expiresAtMs: oauth.expiresAt,
      bufferMs: REFRESH_BUFFER_MS,
    })
  }

  function refreshToken(ctx, creds) {
    const { oauth, source, fullData } = creds
    if (!oauth.refreshToken) {
      ctx.host.log.warn("refresh skipped: no refresh token")
      return null
    }

    const oauthConfig = getOauthConfig(ctx)
    ctx.host.log.info("attempting token refresh")
    try {
      const resp = ctx.util.request({
        method: "POST",
        url: oauthConfig.refreshUrl,
        headers: { "Content-Type": "application/json" },
        bodyText: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: oauth.refreshToken,
          client_id: oauthConfig.clientId,
          scope: SCOPES,
        }),
        timeoutMs: 15000,
      })

      if (resp.status === 400 || resp.status === 401) {
        let errorCode = null
        const body = ctx.util.tryParseJson(resp.bodyText)
        if (body) errorCode = body.error || body.error_description
        ctx.host.log.error("refresh failed: status=" + resp.status + " error=" + String(errorCode))
        if (errorCode === "invalid_grant") {
          throw "Session expired. Run `claude` to log in again."
        }
        throw "Token expired. Run `claude` to log in again."
      }
      if (resp.status < 200 || resp.status >= 300) {
        ctx.host.log.warn("refresh returned unexpected status: " + resp.status)
        return null
      }

      const body = ctx.util.tryParseJson(resp.bodyText)
      if (!body) {
        ctx.host.log.warn("refresh response not valid JSON")
        return null
      }
      const newAccessToken = body.access_token
      if (!newAccessToken) {
        ctx.host.log.warn("refresh response missing access_token")
        return null
      }

      // Update oauth credentials
      oauth.accessToken = newAccessToken
      if (body.refresh_token) oauth.refreshToken = body.refresh_token
      if (typeof body.expires_in === "number") {
        oauth.expiresAt = Date.now() + body.expires_in * 1000
      }

      // Persist updated credentials back to the same source we read from.
      fullData.claudeAiOauth = oauth
      saveCredentials(ctx, source, creds.serviceName, fullData)

      ctx.host.log.info("refresh succeeded, new token expires in " + (body.expires_in || "unknown") + "s")
      return newAccessToken
    } catch (e) {
      if (typeof e === "string") throw e
      ctx.host.log.error("refresh exception: " + String(e))
      return null
    }
  }

  function fetchUsage(ctx, accessToken) {
    const oauthConfig = getOauthConfig(ctx)
    return ctx.util.request({
      method: "GET",
      url: oauthConfig.usageUrl,
      headers: {
        Authorization: "Bearer " + accessToken.trim(),
        Accept: "application/json",
        "Content-Type": "application/json",
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": "claude-code/2.1.69",
      },
      timeoutMs: 10000,
    })
  }

  function parseRetryAfterSeconds(headers) {
    if (!headers) return null
    const raw = headers["retry-after"] ?? headers["Retry-After"]
    if (raw === undefined || raw === null) return null
    const str = String(raw).trim()
    if (!str) return null
    // Retry-After can be a delay-seconds or HTTP-date (RFC 7231).
    // 0 means "retry immediately" — return 0 as a valid value.
    const seconds = parseInt(str, 10)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds
    const dateMs = Date.parse(str)
    if (Number.isFinite(dateMs)) {
      const delay = Math.ceil((dateMs - Date.now()) / 1000)
      return delay > 0 ? delay : 0
    }
    return null
  }

  function fmtRateLimitMinutes(seconds) {
    if (seconds <= 0) return "now"
    const mins = Math.ceil(seconds / 60)
    return mins + "m"
  }

  function reportingTimeZone(ctx) {
    if (ctx.util.reportingTimeZoneOrDefault) {
      return ctx.util.reportingTimeZoneOrDefault(ctx.app && ctx.app.reportingTimeZone)
    }
    const value = ctx.app && typeof ctx.app.reportingTimeZone === "string"
      ? ctx.app.reportingTimeZone.trim()
      : ""
    return value || DEFAULT_REPORTING_TIME_ZONE
  }

  function queryTokenUsage(ctx, homePath, reportingTimeZone) {
    // Inclusive range: today + previous 30 days = 31 calendar days.
    const sinceDay = addReportingDays(sampleDay(ctx, reportingTimeZone), -30)
    let sinceStr = sinceDay ? sinceDay.replace(/-/g, "") : ""
    if (!sinceStr) {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const y = since.getFullYear()
      const m = since.getMonth() + 1
      const d = since.getDate()
      sinceStr = "" + y + (m < 10 ? "0" : "") + m + (d < 10 ? "0" : "") + d
    }

    const queryOpts = { since: sinceStr, timezone: reportingTimeZone }
    if (homePath) {
      queryOpts.homePath = homePath
    }

    const result = ctx.host.ccusage.query(queryOpts)
    if (!result || typeof result !== "object" || typeof result.status !== "string") {
      return { status: "runner_failed", data: null }
    }
    if (result.status !== "ok") {
      return { status: result.status, data: null }
    }
    if (!result.data || !Array.isArray(result.data.daily)) {
      return { status: "runner_failed", data: null }
    }
    return { status: "ok", data: result.data }
  }

  function discoverEportAccountPartitions(ctx) {
    if (!ctx.host.fs || typeof ctx.host.fs.exists !== "function" || typeof ctx.host.fs.listDir !== "function") {
      return []
    }

    const root = joinPath(getClaudeHomePath(ctx), EPORT_ACCOUNTS_DIR)
    try {
      if (!ctx.host.fs.exists(root)) return []
      return ctx.host.fs.listDir(root)
        .map((name) => String(name || "").trim())
        .filter(Boolean)
        .map((fingerprint) => ({
          providerAccountFingerprint: fingerprint,
          homePath: joinPath(root, fingerprint),
        }))
    } catch (e) {
      ctx.host.log.warn("ePort Claude account partition discovery failed: " + String(e))
      return []
    }
  }

  function fmtTokens(n) {
    const abs = Math.abs(n)
    const sign = n < 0 ? "-" : ""
    const units = [
      { threshold: 1e9, divisor: 1e9, suffix: "B" },
      { threshold: 1e6, divisor: 1e6, suffix: "M" },
      { threshold: 1e3, divisor: 1e3, suffix: "K" },
    ]
    for (let i = 0; i < units.length; i++) {
      const unit = units[i]
      if (abs >= unit.threshold) {
        const scaled = abs / unit.divisor
        const formatted = scaled >= 10
          ? Math.round(scaled).toString()
          : scaled.toFixed(1).replace(/\.0$/, "")
        return sign + formatted + unit.suffix
      }
    }
    return sign + Math.round(abs).toString()
  }

  function dayKeyFromDate(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return year + "-" + (month < 10 ? "0" : "") + month + "-" + (day < 10 ? "0" : "") + day
  }

  function dayKeyFromUsageDate(rawDate) {
    if (typeof rawDate !== "string") return null
    const value = rawDate.trim()
    if (!value) return null

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
      return isoMatch[1] + "-" + isoMatch[2] + "-" + isoMatch[3]
    }

    const isoDatePrefixMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[Tt\s]|$)/)
    if (isoDatePrefixMatch) {
      return isoDatePrefixMatch[1] + "-" + isoDatePrefixMatch[2] + "-" + isoDatePrefixMatch[3]
    }

    const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (compactMatch) {
      return compactMatch[1] + "-" + compactMatch[2] + "-" + compactMatch[3]
    }

    const ms = Date.parse(value)
    if (!Number.isFinite(ms)) return null
    return dayKeyFromDate(new Date(ms))
  }

  function usageCostUsd(day) {
    if (!day || typeof day !== "object") return null

    if (day.totalCost != null) {
      const totalCost = Number(day.totalCost)
      if (Number.isFinite(totalCost)) return totalCost
    }

    if (day.costUSD != null) {
      const costUSD = Number(day.costUSD)
      if (Number.isFinite(costUSD)) return costUSD
    }

    return null
  }

  function modelTokenCount(modelUsage) {
    if (!modelUsage || typeof modelUsage !== "object") return 0
    const total = Number(modelUsage.totalTokens)
    if (Number.isFinite(total) && total > 0) return total

    const fields = [
      "inputTokens",
      "cachedInputTokens",
      "cacheCreationTokens",
      "cacheReadTokens",
      "outputTokens",
      "reasoningOutputTokens",
    ]
    let sum = 0
    for (let i = 0; i < fields.length; i++) {
      const n = Number(modelUsage[fields[i]])
      if (Number.isFinite(n) && n > 0) sum += n
    }
    return sum
  }

  function collectModelUsage(daily) {
    const totals = {}
    let totalTokens = 0
    for (let i = 0; i < daily.length; i++) {
      const day = daily[i]
      const models = day && day.models
      if (models && typeof models === "object") {
        const names = Object.keys(models)
        for (let j = 0; j < names.length; j++) {
          const name = names[j]
          const tokens = modelTokenCount(models[name])
          if (tokens <= 0) continue
          totals[name] = (totals[name] || 0) + tokens
          totalTokens += tokens
        }
      }

      const breakdowns = day && day.modelBreakdowns
      if (Array.isArray(breakdowns)) {
        for (let j = 0; j < breakdowns.length; j++) {
          const breakdown = breakdowns[j]
          const name = String(
            (breakdown && (breakdown.modelName || breakdown.name || breakdown.model)) || ""
          ).trim()
          if (!name) continue
          const tokens = modelTokenCount(breakdown)
          if (tokens <= 0) continue
          totals[name] = (totals[name] || 0) + tokens
          totalTokens += tokens
        }
      }
    }

    if (totalTokens <= 0) return []
    return Object.keys(totals)
      .map((name) => ({ name, tokens: totals[name], percent: (totals[name] / totalTokens) * 100 }))
      .sort((a, b) => b.tokens - a.tokens || a.name.localeCompare(b.name))
  }

  function percentLabel(value) {
    if (value > 0 && value < 0.1) return "<0.1%"
    const rounded = Math.round(value * 10) / 10
    return (rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded)) + "%"
  }

  function pushModelUsageLines(lines, ctx, daily) {
    const models = collectModelUsage(daily)
    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      lines.push(ctx.line.text({
        label: model.name,
        value: percentLabel(model.percent),
      }))
    }
  }

  function usageDayLabel(rawDate) {
    const key = dayKeyFromUsageDate(rawDate)
    if (!key) return String(rawDate || "").slice(0, 10) || "Usage"
    const month = Number(key.slice(5, 7))
    const day = Number(key.slice(8, 10))
    return month + "/" + day
  }

  function collectUsageChartPoints(daily) {
    const points = []
    for (let i = 0; i < daily.length; i++) {
      const day = daily[i]
      const tokens = Number(day && day.totalTokens)
      if (!Number.isFinite(tokens) || tokens < 0) continue
      const key = dayKeyFromUsageDate(day.date)
      if (!key) continue
      points.push({
        key: key,
        label: usageDayLabel(day.date),
        value: tokens,
        valueLabel: fmtTokens(tokens) + " tokens",
      })
    }
    return points
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-31)
      .map((point) => ({
        label: point.label,
        value: point.value,
        valueLabel: point.valueLabel,
      }))
  }

  function pushUsageChartLine(lines, ctx, daily) {
    const points = collectUsageChartPoints(daily)
    if (points.length === 0) return
    lines.push(ctx.line.barChart({
      label: "Usage Trend",
      points: points,
      note: "Estimated from local Claude logs at API rates.",
      color: "#DE7356",
    }))
  }

  function readNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    return null
  }

  function centsToUsd(value) {
    const cents = readNumber(value)
    return cents === null ? null : Math.round((cents / 100) * 100) / 100
  }

  function setNumber(target, key, value) {
    const n = readNumber(value)
    if (n !== null) target[key] = n
  }

  function setString(target, key, value) {
    if (typeof value !== "string") return
    const trimmed = value.trim()
    if (trimmed) target[key] = trimmed
  }

  function sampleDay(ctx, reportingTimeZone) {
    const parsed = ctx.util.parseDateMs(ctx.nowIso)
    const timestamp = Number.isFinite(parsed) ? parsed : Date.now()
    if (ctx.util.formatReportingDay) {
      const day = ctx.util.formatReportingDay(timestamp, reportingTimeZone)
      if (day) return day
    }
    return new Date(timestamp).toISOString().slice(0, 10)
  }

  function addReportingDays(day, amount) {
    const start = Date.parse(day + "T00:00:00.000Z")
    if (!Number.isFinite(start)) return null
    return new Date(start + amount * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  }

  function dayStartMs(ctx, day, reportingTimeZone) {
    if (ctx.util.reportingDayToUtcBoundary) {
      const boundary = ctx.util.reportingDayToUtcBoundary(day, reportingTimeZone)
      if (Number.isFinite(boundary)) return boundary
    }
    const ms = Date.parse(day + "T00:00:00.000Z")
    return Number.isFinite(ms) ? ms : null
  }

  function dayEndMs(ctx, day, reportingTimeZone) {
    const nextDay = addReportingDays(day, 1)
    return nextDay ? dayStartMs(ctx, nextDay, reportingTimeZone) : null
  }

  function reportingDayBucket(ctx, day, reportingTimeZone) {
    const startMs = dayStartMs(ctx, day, reportingTimeZone)
    const endMs = dayEndMs(ctx, day, reportingTimeZone)
    if (startMs === null || endMs === null) return null
    return {
      kind: "reportingDay",
      day,
      reportingTimeZone,
      startMs,
      endMs,
    }
  }

  function resetAtMs(ctx, window) {
    if (!window || typeof window !== "object") return null
    const iso = ctx.util.toIso(window.resets_at)
    if (!iso) return null
    const ms = ctx.util.parseDateMs(iso)
    return Number.isFinite(ms) ? ms : null
  }

  function windowPeriod(ctx, window, fallbackMs) {
    const end = resetAtMs(ctx, window)
    if (end === null) return { start: null, end: null }
    return { start: end - fallbackMs, end }
  }

  function normalizeMetricSegment(value) {
    const segment = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^claude\s+/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+([a-z0-9])/g, (_, letter) => letter.toUpperCase())
    return segment || "model"
  }

  function addMetricSample(samples, metricKey, value, unit, day, source, period, bucket) {
    const n = readNumber(value)
    if (n === null) return
    const sample = {
      metricKey,
      value: n,
      unit,
      sampleDay: day,
      source: source || "providerReported",
    }
    if (bucket) {
      sample.periodStart = bucket.startMs
      sample.periodEnd = bucket.endMs
      sample.bucket = bucket
    } else {
      if (period && period.start !== null) sample.periodStart = period.start
      if (period && period.end !== null) sample.periodEnd = period.end
    }
    samples.push(sample)
  }

  function addWindowSample(ctx, samples, metricKey, value, day, window, fallbackMs) {
    addMetricSample(
      samples,
      metricKey,
      value,
      "percent",
      day,
      "providerReported",
      windowPeriod(ctx, window, fallbackMs)
    )
  }

  function addTokenUsageSamples(ctx, samples, usageDay, sampleSourceDay, reportingTimeZone, source) {
    if (!usageDay || typeof usageDay !== "object") return
    const bucket = reportingDayBucket(ctx, sampleSourceDay, reportingTimeZone)
    const sampleSource = source || "providerReported"
    addMetricSample(samples, "claude.tokens.total", usageDay.totalTokens, "tokens", sampleSourceDay, sampleSource, null, bucket)
    addMetricSample(samples, "claude.tokens.input", usageDay.inputTokens, "tokens", sampleSourceDay, sampleSource, null, bucket)
    addMetricSample(samples, "claude.tokens.output", usageDay.outputTokens, "tokens", sampleSourceDay, sampleSource, null, bucket)
    addMetricSample(samples, "claude.tokens.cacheCreation", usageDay.cacheCreationTokens, "tokens", sampleSourceDay, sampleSource, null, bucket)
    addMetricSample(samples, "claude.tokens.cacheRead", usageDay.cacheReadTokens, "tokens", sampleSourceDay, sampleSource, null, bucket)
    addMetricSample(samples, "claude.cost.estimated", usageCostUsd(usageDay), "usd", sampleSourceDay, "estimated", null, bucket)
  }

  function extractorVersion() {
    return { claude: CLAUDE_EXTRACTOR_VERSION }
  }

  function metricFamilies(summary, samples) {
    const families = []
    if (summary.tokensTotal !== undefined) families.push("tokens")
    if (summary.estimatedCostUsd !== undefined) families.push("estimatedCost")
    if (summary.quotaPercent !== undefined) families.push("quotaPressure")
    if (summary.budgetUsedUsd !== undefined || summary.budgetLimitUsd !== undefined) families.push("budget")
    if (summary.creditsUsed !== undefined) families.push("credits")
    if (samples.some((sample) => sample.metricKey.indexOf("claude.") === 0 && sample.metricKey.endsWith(".percentUsed"))) {
      families.push("claudeRateLimits")
    }
    return families.length > 0 ? families : ["claude"]
  }

  function addWindowFact(ctx, target, samples, opts) {
    const window = opts.window
    if (!window || typeof window !== "object") return null
    const used = readNumber(window.utilization)
    if (used === null) return null
    setNumber(target, opts.usedKey, used)
    setNumber(target, opts.resetKey, resetAtMs(ctx, window))
    target[opts.durationKey] = opts.durationMs / 1000
    addWindowSample(ctx, samples, opts.metricKey, used, opts.day, window, opts.durationMs)
    return used
  }

  function buildClaudeSourceFacts(ctx, data, tokenUsageResult, plan, creds) {
    const timeZone = reportingTimeZone(ctx)
    const day = sampleDay(ctx, timeZone)
    const usage = data && typeof data === "object" ? data : {}
    const oauth = creds && creds.oauth ? creds.oauth : {}
    const claude = {}
    setString(claude, "planName", plan)
    setString(claude, "subscriptionType", oauth.subscriptionType)
    setString(claude, "rateLimitTier", oauth.rateLimitTier)

    const samples = []
    const sessionUsed = addWindowFact(ctx, claude, samples, {
      window: usage.five_hour,
      usedKey: "sessionUsedPercent",
      resetKey: "sessionResetAt",
      durationKey: "sessionWindowSeconds",
      metricKey: "claude.session.percentUsed",
      durationMs: PERIOD_SESSION_MS,
      day,
    })
    addWindowFact(ctx, claude, samples, {
      window: usage.seven_day,
      usedKey: "weeklyUsedPercent",
      resetKey: "weeklyResetAt",
      durationKey: "weeklyWindowSeconds",
      metricKey: "claude.weekly.percentUsed",
      durationMs: PERIOD_WEEKLY_MS,
      day,
    })

    const modelWindows = []
    for (const spec of MODEL_WINDOWS) {
      const window = usage[spec.key]
      if (!window || typeof window !== "object") continue
      const used = readNumber(window.utilization)
      if (used === null) continue
      const item = {
        key: spec.key,
        name: spec.name,
        usedPercent: used,
        windowSeconds: PERIOD_WEEKLY_MS / 1000,
      }
      const reset = resetAtMs(ctx, window)
      if (reset !== null) item.resetAt = reset
      modelWindows.push(item)
      addWindowSample(
        ctx,
        samples,
        "claude.model." + normalizeMetricSegment(spec.segment) + ".percentUsed",
        used,
        day,
        window,
        PERIOD_WEEKLY_MS
      )
    }
    if (modelWindows.length > 0) claude.modelWindows = modelWindows

    const extraUsage = usage.extra_usage && typeof usage.extra_usage === "object"
      ? usage.extra_usage
      : null
    let extraUsedUsd = null
    let extraLimitUsd = null
    if (extraUsage) {
      if (typeof extraUsage.is_enabled === "boolean") claude.extraUsageEnabled = extraUsage.is_enabled
      setString(claude, "extraUsageCurrency", extraUsage.currency)
      extraUsedUsd = centsToUsd(extraUsage.used_credits)
      extraLimitUsd = centsToUsd(extraUsage.monthly_limit)
      setNumber(claude, "extraUsageUsedUsd", extraUsedUsd)
      setNumber(claude, "extraUsageMonthlyLimitUsd", extraLimitUsd)
      if (readNumber(extraUsage.monthly_limit) === 0) claude.extraUsageUnlimited = true
      addMetricSample(samples, "claude.extraUsage.used", extraUsedUsd, "usd", day, "providerReported")
      if (extraLimitUsd !== null && extraLimitUsd > 0) {
        addMetricSample(samples, "claude.extraUsage.monthlyLimit", extraLimitUsd, "usd", day, "providerReported")
      }
    }

    const summary = { provider: { claude } }
    setNumber(summary, "quotaPercent", sessionUsed)
    setNumber(summary, "budgetUsedUsd", extraUsedUsd)
    if (extraLimitUsd !== null && extraLimitUsd > 0) {
      summary.budgetLimitUsd = extraLimitUsd
    }
    setNumber(summary, "creditsUsed", extraUsedUsd)

    if (tokenUsageResult.status === "ok") {
      let todayEntry = null
      for (let i = 0; i < tokenUsageResult.data.daily.length; i++) {
        const usageDay = tokenUsageResult.data.daily[i]
        const usageDayKey = dayKeyFromUsageDate(usageDay.date)
        if (usageDayKey) addTokenUsageSamples(ctx, samples, usageDay, usageDayKey, timeZone)
        if (usageDayKey === day) todayEntry = usageDay
      }

      const todayTokens = Number(todayEntry && todayEntry.totalTokens) || 0
      const todayCost = usageCostUsd(todayEntry) || 0
      summary.tokensTotal = todayTokens
      summary.estimatedCostUsd = todayCost
      claude.todayTokens = todayTokens
      claude.todayEstimatedCostUsd = todayCost
    }

    if (samples.length === 0) {
      addMetricSample(samples, "claude.probe.success", 1, "count", day, "normalized")
    }

    return {
      periodStart: dayStartMs(ctx, day, timeZone),
      periodEnd: dayEndMs(ctx, day, timeZone),
      periodKey: "claude:" + day,
      dataIdentity: "claude:daily:" + day,
      summary,
      summaryVersion: SUMMARY_VERSION,
      extractorVersion: extractorVersion(),
      metricFamilies: metricFamilies(summary, samples),
      metricSamples: samples,
    }
  }

  function buildClaudeRawPayload(data, tokenUsageResult, creds) {
    return {
      usage: redactPayloadValue(data || {}),
      tokenUsage: tokenUsageResult.status === "ok"
        ? { status: "ok", daily: redactPayloadValue(tokenUsageResult.data.daily) }
        : { status: tokenUsageResult.status },
      auth: redactPayloadValue({
        source: creds ? creds.source : null,
        inferenceOnly: !!(creds && creds.inferenceOnly),
        oauth: creds && creds.oauth ? creds.oauth : null,
      }),
    }
  }

  function buildEportPartitionSourceFacts(ctx, partition, tokenUsageResult, reportingTimeZone) {
    const day = sampleDay(ctx, reportingTimeZone)
    const claude = {
      eportAccountFingerprint: partition.providerAccountFingerprint,
      eportPartitionStatus: tokenUsageResult.status,
      eportProjectFolder: EPORT_SYNTHETIC_PROJECT_DIR,
    }
    const summary = { provider: { claude } }
    const samples = []

    if (tokenUsageResult.status === "ok") {
      let todayEntry = null
      for (let i = 0; i < tokenUsageResult.data.daily.length; i++) {
        const usageDay = tokenUsageResult.data.daily[i]
        const usageDayKey = dayKeyFromUsageDate(usageDay.date)
        if (usageDayKey) addTokenUsageSamples(ctx, samples, usageDay, usageDayKey, reportingTimeZone, "calculated")
        if (usageDayKey === day) todayEntry = usageDay
      }

      const todayTokens = Number(todayEntry && todayEntry.totalTokens) || 0
      const todayCost = usageCostUsd(todayEntry) || 0
      summary.tokensTotal = todayTokens
      summary.estimatedCostUsd = todayCost
      claude.todayTokens = todayTokens
      claude.todayEstimatedCostUsd = todayCost
    }

    return {
      periodStart: dayStartMs(ctx, day, reportingTimeZone),
      periodEnd: dayEndMs(ctx, day, reportingTimeZone),
      periodKey: "claude:" + day,
      dataIdentity: "eport:claude:" + partition.providerAccountFingerprint + ":daily:" + day,
      summary,
      summaryVersion: SUMMARY_VERSION,
      extractorVersion: extractorVersion(),
      metricFamilies: metricFamilies(summary, samples),
      metricSamples: samples,
    }
  }

  function eportPartitionDetection(partition) {
    return {
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      identityKind: "providerAccountId",
      identityValue: partition.providerAccountFingerprint,
      identityConfidence: "high",
    }
  }

  function eportPartitionRawPayload(partition, tokenUsageResult) {
    return {
      eportPartition: {
        providerAccountFingerprint: partition.providerAccountFingerprint,
        projectFolder: EPORT_SYNTHETIC_PROJECT_DIR,
      },
      tokenUsage: tokenUsageResult.status === "ok"
        ? { status: "ok", daily: redactPayloadValue(tokenUsageResult.data.daily) }
        : { status: tokenUsageResult.status },
    }
  }

  function appendTokenUsageLines(lines, ctx, tokenUsage, timeZone) {
    const todayKey = ctx.util.formatReportingDay
      ? ctx.util.formatReportingDay(Date.now(), timeZone)
      : dayKeyFromDate(new Date())
    const yesterdayKey = addReportingDays(todayKey, -1)

    let todayEntry = null
    let yesterdayEntry = null
    for (let i = 0; i < tokenUsage.daily.length; i++) {
      const usageDayKey = dayKeyFromUsageDate(tokenUsage.daily[i].date)
      if (usageDayKey === todayKey) {
        todayEntry = tokenUsage.daily[i]
        continue
      }
      if (usageDayKey === yesterdayKey) {
        yesterdayEntry = tokenUsage.daily[i]
      }
    }

    pushDayUsageLine(lines, ctx, "Today", todayEntry)
    pushDayUsageLine(lines, ctx, "Yesterday", yesterdayEntry)

    let totalTokens = 0
    let totalCostNanos = 0
    let hasCost = false
    for (let i = 0; i < tokenUsage.daily.length; i++) {
      const day = tokenUsage.daily[i]
      const dayTokens = Number(day.totalTokens)
      if (Number.isFinite(dayTokens)) {
        totalTokens += dayTokens
      }
      const dayCost = usageCostUsd(day)
      if (dayCost != null) {
        totalCostNanos += Math.round(dayCost * 1e9)
        hasCost = true
      }
    }
    if (totalTokens > 0) {
      lines.push(ctx.line.text({
        label: "Last 30 Days",
        value: costAndTokensLabel({ tokens: totalTokens, costUSD: hasCost ? totalCostNanos / 1e9 : null })
      }))
    }

    pushUsageChartLine(lines, ctx, tokenUsage.daily)
    pushModelUsageLines(lines, ctx, tokenUsage.daily)
  }

  function buildEportProviderAccountOutput(ctx, partition, tokenUsageResult, timeZone) {
    const lines = []
    if (tokenUsageResult.status === "ok") {
      appendTokenUsageLines(lines, ctx, tokenUsageResult.data, timeZone)
    } else {
      lines.push(ctx.line.badge({
        label: "Status",
        text: "Usage unavailable",
        color: "#a3a3a3",
        subtitle: "ePort account partition could not be read.",
      }))
    }

    return {
      providerAccountDetections: [eportPartitionDetection(partition)],
      lines,
      sourceFacts: buildEportPartitionSourceFacts(ctx, partition, tokenUsageResult, timeZone),
      rawPayload: eportPartitionRawPayload(partition, tokenUsageResult),
    }
  }

  function queryEportProviderAccountOutputs(ctx, timeZone) {
    const partitions = discoverEportAccountPartitions(ctx)
    const outputs = []
    for (let i = 0; i < partitions.length; i++) {
      const partition = partitions[i]
      const tokenUsageResult = queryTokenUsage(ctx, partition.homePath, timeZone)
      outputs.push(buildEportProviderAccountOutput(ctx, partition, tokenUsageResult, timeZone))
    }
    return outputs
  }

  function redactPayloadValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => redactPayloadValue(item))
    }
    if (!value || typeof value !== "object") return value

    const out = {}
    for (const key of Object.keys(value)) {
      out[key] = isSensitivePayloadKey(key) ? REDACTED_VALUE : redactPayloadValue(value[key])
    }
    return out
  }

  function isSensitivePayloadKey(key) {
    const normalized = String(key || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
    return (
      normalized === "token" ||
      normalized === "accesstoken" ||
      normalized === "refreshtoken" ||
      normalized === "secret" ||
      normalized === "apikey" ||
      normalized === "secretkey" ||
      normalized === "accesskey" ||
      normalized === "key" ||
      normalized === "cookie" ||
      normalized === "authorization" ||
      normalized === "password" ||
      normalized === "credential" ||
      normalized.endsWith("token") ||
      normalized.endsWith("password") ||
      normalized.endsWith("secret") ||
      normalized.endsWith("credential")
    )
  }

  function costAndTokensLabel(data, opts) {
    const includeZeroTokens = !!(opts && opts.includeZeroTokens)
    const parts = []
    if (data.costUSD != null) parts.push("$" + data.costUSD.toFixed(2))
    if (data.tokens > 0 || (includeZeroTokens && data.tokens === 0)) {
      parts.push(fmtTokens(data.tokens) + " tokens")
    }
    return parts.join(" \u00b7 ")
  }

  function pushDayUsageLine(lines, ctx, label, dayEntry) {
    const tokens = Number(dayEntry && dayEntry.totalTokens) || 0
    const cost = usageCostUsd(dayEntry)
    if (tokens > 0) {
      lines.push(ctx.line.text({
        label: label,
        value: costAndTokensLabel({ tokens: tokens, costUSD: cost })
      }))
      return
    }

    lines.push(ctx.line.text({
      label: label,
      value: costAndTokensLabel({ tokens: 0, costUSD: 0 }, { includeZeroTokens: true })
    }))
  }

  function probe(ctx) {
    const creds = loadCredentials(ctx)
    if (!creds || !creds.oauth || !creds.oauth.accessToken || !creds.oauth.accessToken.trim()) {
      ctx.host.log.error("probe failed: not logged in")
      throw "Not logged in. Run `claude` to authenticate."
    }

    const nowMs = Date.now()
    let accessToken = creds.oauth.accessToken
    const homePath = getClaudeHomeOverride(ctx)
    const canFetchLiveUsage = hasProfileScope(creds)

    let data = null
    let lines = []
    let rateLimited = false
    let retryAfterSeconds = null
    if (canFetchLiveUsage) {
      if (nowMs < rateLimitedUntilMs) {
        // Still within a rate-limit window from a previous probe call — skip the
        // API request entirely and surface the remaining wait time to the user.
        rateLimited = true
        retryAfterSeconds = Math.ceil((rateLimitedUntilMs - nowMs) / 1000)
        data = cachedUsageData
        ctx.host.log.info("usage fetch skipped: rate-limited for " + retryAfterSeconds + "s more")
      } else {
        // Rate-limit window has expired (or was never set).  Check whether we were
        // previously rate-limited so we can bypass the min-interval guard: a short
        // Retry-After (< 5 min) must not be swallowed by the normal poll throttle.
        const wasRateLimited = rateLimitedUntilMs > 0
        rateLimitedUntilMs = 0

        if (!wasRateLimited && nowMs - lastUsageFetchMs < MIN_USAGE_FETCH_INTERVAL_MS) {
          // Polled too recently in normal operation — reuse last cached response.
          data = cachedUsageData
          ctx.host.log.info(
            "usage fetch skipped: last fetch was " +
            Math.round((nowMs - lastUsageFetchMs) / 1000) + "s ago (min interval " +
            MIN_USAGE_FETCH_INTERVAL_MS / 1000 + "s)"
          )
        } else {
        // Proactively refresh if token is expired or about to expire
        if (needsRefresh(ctx, creds.oauth, nowMs)) {
          ctx.host.log.info("token needs refresh (expired or expiring soon)")
          const refreshed = refreshToken(ctx, creds)
          if (refreshed) {
            accessToken = refreshed
          } else {
            ctx.host.log.warn("proactive refresh failed, trying with existing token")
          }
        }

        lastUsageFetchMs = nowMs
        let resp
        let didRefresh = false
        try {
          resp = ctx.util.retryOnceOnAuth({
            request: (token) => {
              try {
                return fetchUsage(ctx, token || accessToken)
              } catch (e) {
                ctx.host.log.error("usage request exception: " + String(e))
                if (didRefresh) {
                  throw "Usage request failed after refresh. Try again."
                }
                throw "Usage request failed. Check your connection."
              }
            },
            refresh: () => {
              ctx.host.log.info("usage returned 401, attempting refresh")
              didRefresh = true
              return refreshToken(ctx, creds)
            },
          })
        } catch (e) {
          if (typeof e === "string") throw e
          ctx.host.log.error("usage request failed: " + String(e))
          throw "Usage request failed. Check your connection."
        }

        if (ctx.util.isAuthStatus(resp.status)) {
          ctx.host.log.error("usage returned auth error after all retries: status=" + resp.status)
          throw "Token expired. Run `claude` to log in again."
        }

        if (resp.status === 429) {
          rateLimited = true
          retryAfterSeconds = parseRetryAfterSeconds(resp.headers)
          const backoffMs = retryAfterSeconds !== null
            ? retryAfterSeconds * 1000
            : DEFAULT_RATE_LIMIT_BACKOFF_MS
          rateLimitedUntilMs = nowMs + backoffMs
          data = cachedUsageData
          ctx.host.log.warn(
            "usage rate limited (429), backing off for " +
            Math.round(backoffMs / 1000) + "s"
          )
        } else if (resp.status < 200 || resp.status >= 300) {
          ctx.host.log.error("usage returned error: status=" + resp.status)
          throw "Usage request failed (HTTP " + String(resp.status) + "). Try again later."
        } else {
          ctx.host.log.info("usage fetch succeeded")
          data = ctx.util.tryParseJson(resp.bodyText)
          if (data === null) {
            throw "Usage response invalid. Try again later."
          }
          cachedUsageData = data
          rateLimitedUntilMs = 0
        }
        } // end fetch else-branch
      }
    } else {
      ctx.host.log.info("skipping live usage fetch for inference-only token")
    }

    let plan = null
    if (creds.oauth.subscriptionType) {
      const basePlan = ctx.fmt.planLabel(creds.oauth.subscriptionType)
      if (basePlan) {
        let tierSuffix = ""
        const rlt = String(creds.oauth.rateLimitTier || "")
        const tierMatch = rlt.match(/(\d+)x/)
        if (tierMatch) {
          tierSuffix = " " + tierMatch[1] + "x"
        }
        plan = basePlan + tierSuffix
      }
    }

    if (data) {
      if (data.five_hour && typeof data.five_hour.utilization === "number") {
        lines.push(ctx.line.progress({
          label: "Session",
          used: data.five_hour.utilization,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: ctx.util.toIso(data.five_hour.resets_at),
          periodDurationMs: 5 * 60 * 60 * 1000 // 5 hours
        }))
      }
      if (data.seven_day && typeof data.seven_day.utilization === "number") {
        lines.push(ctx.line.progress({
          label: "Weekly",
          used: data.seven_day.utilization,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: ctx.util.toIso(data.seven_day.resets_at),
          periodDurationMs: 7 * 24 * 60 * 60 * 1000 // 7 days
        }))
      }
      if (data.seven_day_sonnet && typeof data.seven_day_sonnet.utilization === "number") {
        lines.push(ctx.line.progress({
          label: "Sonnet",
          used: data.seven_day_sonnet.utilization,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: ctx.util.toIso(data.seven_day_sonnet.resets_at),
          periodDurationMs: 7 * 24 * 60 * 60 * 1000 // 7 days
        }))
      }
      if (data.seven_day_opus && typeof data.seven_day_opus.utilization === "number") {
        lines.push(ctx.line.progress({
          label: "Opus",
          used: data.seven_day_opus.utilization,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: ctx.util.toIso(data.seven_day_opus.resets_at),
          periodDurationMs: 7 * 24 * 60 * 60 * 1000 // 7 days
        }))
      }
      if (data.seven_day_omelette && typeof data.seven_day_omelette.utilization === "number") {
        lines.push(ctx.line.progress({
          label: "Claude Design",
          used: data.seven_day_omelette.utilization,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: ctx.util.toIso(data.seven_day_omelette.resets_at),
          periodDurationMs: 7 * 24 * 60 * 60 * 1000 // 7 days
        }))
      }

      if (data.extra_usage && data.extra_usage.is_enabled) {
        const used = data.extra_usage.used_credits
        const limit = data.extra_usage.monthly_limit
        if (typeof used === "number" && typeof limit === "number" && limit > 0) {
          lines.push(ctx.line.progress({
            label: "Extra usage spent",
            used: ctx.fmt.dollars(used),
            limit: ctx.fmt.dollars(limit),
            format: { kind: "dollars" }
          }))
        } else if (typeof used === "number" && used > 0) {
          lines.push(ctx.line.text({ label: "Extra usage spent", value: "$" + String(ctx.fmt.dollars(used)) }))
        }
      }
    }

    const timeZone = reportingTimeZone(ctx)
    const usageResult = queryTokenUsage(ctx, homePath, timeZone)
    const providerAccountOutputs = queryEportProviderAccountOutputs(ctx, timeZone)
    if (usageResult.status === "ok") {
      appendTokenUsageLines(lines, ctx, usageResult.data, timeZone)
    }

    if (rateLimited) {
      const retryText = retryAfterSeconds !== null
        ? fmtRateLimitMinutes(retryAfterSeconds)
        : null
      const waitText = retryText
        ? "Rate limited, retry in ~" + retryText
        : "Rate limited, try again later"
      lines.unshift(ctx.line.badge({ label: "Status", text: waitText, color: "#f59e0b" }))
      const noteText = retryText
        ? "Live usage rate limited — retry in ~" + retryText
        : "Live usage rate limited — data may be stale"
      lines.push(ctx.line.text({ label: "Note", value: noteText }))
    } else if (lines.length === 0) {
      lines.push(ctx.line.badge({ label: "Status", text: "No usage data", color: "#a3a3a3" }))
    }

    const output = {
      plan: plan,
      lines: lines,
      providerAccountDetections: providerAccountDetections(ctx, creds),
      sourceFacts: buildClaudeSourceFacts(ctx, data, usageResult, plan, creds),
      rawPayload: buildClaudeRawPayload(data, usageResult, creds),
    }
    if (providerAccountOutputs.length > 0) {
      output.providerAccountOutputs = providerAccountOutputs
    }
    return output
  }

  // _resetState is a testing hook — resets module-scope rate-limit state between tests.
  // The production host never calls this.
  function _resetState() {
    rateLimitedUntilMs = 0
    lastUsageFetchMs = 0
    cachedUsageData = null
  }

  globalThis.__openusage_plugin = { id: "claude", probe, _resetState }
})()
