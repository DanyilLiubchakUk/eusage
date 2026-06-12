(function () {
  const PROVIDER_ID = "cursor"
  const PROVIDER_NAME = "Cursor"
  const MACOS_STATE_DB =
    "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
  const WINDOWS_STATE_DB_RELATIVE = "Cursor/User/globalStorage/state.vscdb"
  const WINDOWS_APPDATA_STATE_DB = "%APPDATA%/" + WINDOWS_STATE_DB_RELATIVE
  const KEYCHAIN_ACCESS_TOKEN_SERVICE = "cursor-access-token"
  const KEYCHAIN_REFRESH_TOKEN_SERVICE = "cursor-refresh-token"
  const BASE_URL = "https://api2.cursor.sh"
  const USAGE_URL = BASE_URL + "/aiserver.v1.DashboardService/GetCurrentPeriodUsage"
  const PLAN_URL = BASE_URL + "/aiserver.v1.DashboardService/GetPlanInfo"
  const REFRESH_URL = BASE_URL + "/oauth/token"
  const CREDITS_URL = BASE_URL + "/aiserver.v1.DashboardService/GetCreditGrantsBalance"
  const REST_USAGE_URL = "https://cursor.com/api/usage"
  const STRIPE_URL = "https://cursor.com/api/auth/stripe"
  const CLIENT_ID = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB"
  const REFRESH_BUFFER_MS = 5 * 60 * 1000 // refresh 5 minutes before expiration
  const LOGIN_HINT = "Sign in via Cursor app or run `agent login`."
  const SQLITE_HELPER_ERROR = "eUsage SQLite helper missing. Update or reinstall eUsage."
  const SUMMARY_VERSION = "1.0.0"
  const CURSOR_EXTRACTOR_VERSION = "1.0.0"

  function readEnvText(ctx, name) {
    if (!ctx.host.env || typeof ctx.host.env.get !== "function") return null
    try {
      const value = ctx.host.env.get(name)
      if (typeof value !== "string") return null
      const trimmed = value.trim()
      return trimmed || null
    } catch (e) {
      ctx.host.log.warn("env read failed for " + name + ": " + String(e))
      return null
    }
  }

  function addStateDbCandidate(candidates, seen, path, label) {
    if (!path || seen[path]) return
    seen[path] = true
    candidates.push({ path: path, label: label || path })
  }

  function joinPath(base, relative) {
    return String(base).replace(/[\\/]+$/g, "") + "/" + relative
  }

  function windowsStateDbCandidates(ctx) {
    const candidates = []
    const seen = Object.create(null)
    const appData = readEnvText(ctx, "APPDATA")
    if (appData) {
      addStateDbCandidate(candidates, seen, joinPath(appData, WINDOWS_STATE_DB_RELATIVE), WINDOWS_APPDATA_STATE_DB)
    }
    addStateDbCandidate(candidates, seen, WINDOWS_APPDATA_STATE_DB, WINDOWS_APPDATA_STATE_DB)
    addStateDbCandidate(candidates, seen, "~/AppData/Roaming/" + WINDOWS_STATE_DB_RELATIVE, "~/AppData/Roaming/" + WINDOWS_STATE_DB_RELATIVE)
    return candidates
  }

  function stateDbCandidates(ctx) {
    const platform = String((ctx.app && ctx.app.platform) || "").toLowerCase()
    const candidates = []
    const seen = Object.create(null)

    if (platform === "windows" || platform === "win32") {
      return windowsStateDbCandidates(ctx)
    }

    addStateDbCandidate(candidates, seen, MACOS_STATE_DB, MACOS_STATE_DB)
    if (platform !== "macos" && platform !== "darwin") {
      const windowsCandidates = windowsStateDbCandidates(ctx)
      for (let i = 0; i < windowsCandidates.length; i += 1) {
        addStateDbCandidate(candidates, seen, windowsCandidates[i].path, windowsCandidates[i].label)
      }
    }
    return candidates
  }

  function readStateValue(ctx, dbPath, dbLabel, key) {
    try {
      const sql =
        "SELECT value FROM ItemTable WHERE key = '" + key + "' LIMIT 1;"
      const json = ctx.host.sqlite.query(dbPath, sql)
      const rows = ctx.util.tryParseJson(json)
      if (!Array.isArray(rows)) {
        throw new Error("sqlite returned invalid json")
      }
      if (rows.length > 0 && rows[0].value) {
        return { ok: true, value: rows[0].value }
      }
    } catch (e) {
      const message = String(e)
      ctx.host.log.warn("sqlite read failed for " + key + " at " + dbLabel + ": " + message)
      if (message.indexOf(SQLITE_HELPER_ERROR) >= 0) {
        throw SQLITE_HELPER_ERROR
      }
      return { ok: false, value: null }
    }
    return { ok: true, value: null }
  }

  function writeStateValue(ctx, dbPath, dbLabel, key, value) {
    try {
      // Escape single quotes in value for SQL
      const escaped = String(value).replace(/'/g, "''")
      const sql =
        "INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('" +
        key +
        "', '" +
        escaped +
        "');"
      ctx.host.sqlite.exec(dbPath || MACOS_STATE_DB, sql)
      return true
    } catch (e) {
      ctx.host.log.warn("sqlite write failed for " + key + " at " + (dbLabel || dbPath || MACOS_STATE_DB) + ": " + String(e))
      return false
    }
  }

  function readKeychainValue(ctx, service) {
    if (!ctx.host.keychain || typeof ctx.host.keychain.readGenericPassword !== "function") {
      return null
    }
    try {
      const value = ctx.host.keychain.readGenericPassword(service)
      if (typeof value !== "string") return null
      const trimmed = value.trim()
      return trimmed || null
    } catch (e) {
      ctx.host.log.info("keychain read failed for " + service + ": " + String(e))
      return null
    }
  }

  function writeKeychainValue(ctx, service, value) {
    if (!ctx.host.keychain || typeof ctx.host.keychain.writeGenericPassword !== "function") {
      ctx.host.log.warn("keychain write unsupported")
      return false
    }
    try {
      ctx.host.keychain.writeGenericPassword(service, String(value))
      return true
    } catch (e) {
      ctx.host.log.warn("keychain write failed for " + service + ": " + String(e))
      return false
    }
  }

  function loadAuthState(ctx) {
    const sqliteState = loadSqliteAuthState(ctx)
    const sqliteAccessToken = sqliteState.accessToken
    const sqliteRefreshToken = sqliteState.refreshToken
    const sqliteMembershipTypeRaw = sqliteState.membershipTypeRaw
    const sqliteCachedEmail = sqliteState.cachedEmail
    const sqliteMembershipType = typeof sqliteMembershipTypeRaw === "string"
      ? sqliteMembershipTypeRaw.trim().toLowerCase()
      : null

    const keychainAccessToken = readKeychainValue(ctx, KEYCHAIN_ACCESS_TOKEN_SERVICE)
    const keychainRefreshToken = readKeychainValue(ctx, KEYCHAIN_REFRESH_TOKEN_SERVICE)

    const sqliteSubject = getTokenSubject(ctx, sqliteAccessToken)
    const keychainSubject = getTokenSubject(ctx, keychainAccessToken)
    const hasDifferentSubjects = !!sqliteSubject && !!keychainSubject && sqliteSubject !== keychainSubject
    const sqliteLooksFree = sqliteMembershipType === "free"

    if (sqliteAccessToken || sqliteRefreshToken) {
      if ((keychainAccessToken || keychainRefreshToken) && sqliteLooksFree && hasDifferentSubjects) {
        ctx.host.log.info("sqlite auth looks free and differs from keychain account; preferring keychain token")
        return {
          accessToken: keychainAccessToken,
          refreshToken: keychainRefreshToken,
          source: "keychain",
          cachedEmail: null,
        }
      }

      return {
        accessToken: sqliteAccessToken,
        refreshToken: sqliteRefreshToken,
        source: "sqlite",
        sourceDbPath: sqliteState.dbPath,
        sourcePath: sqliteState.dbLabel,
        cachedEmail: sqliteCachedEmail,
      }
    }

    if (keychainAccessToken || keychainRefreshToken) {
      return {
        accessToken: keychainAccessToken,
        refreshToken: keychainRefreshToken,
        source: "keychain",
        sourceDbPath: null,
        sourcePath: null,
        cachedEmail: null,
      }
    }

    return {
      accessToken: null,
      refreshToken: null,
      source: null,
      sourceDbPath: null,
      sourcePath: null,
      cachedEmail: null,
    }
  }

  function loadSqliteAuthState(ctx) {
    const candidates = stateDbCandidates(ctx)
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i]
      const access = readStateValue(ctx, candidate.path, candidate.label, "cursorAuth/accessToken")
      const refresh = readStateValue(ctx, candidate.path, candidate.label, "cursorAuth/refreshToken")

      if (access.value || refresh.value) {
        const membership = readStateValue(ctx, candidate.path, candidate.label, "cursorAuth/stripeMembershipType")
        const cachedEmail = readStateValue(ctx, candidate.path, candidate.label, "cursorAuth/cachedEmail")
        return {
          accessToken: access.value,
          refreshToken: refresh.value,
          membershipTypeRaw: membership.value,
          cachedEmail: cachedEmail.value,
          dbPath: candidate.path,
          dbLabel: candidate.label,
        }
      }

      if (!access.ok || !refresh.ok) {
        ctx.host.log.warn("sqlite auth candidate unavailable: " + candidate.label)
      } else {
        ctx.host.log.info("sqlite auth candidate empty: " + candidate.label)
      }
    }

    return {
      accessToken: null,
      refreshToken: null,
      membershipTypeRaw: null,
      cachedEmail: null,
      dbPath: null,
      dbLabel: null,
    }
  }

  function getTokenSubject(ctx, token) {
    if (!token) return null
    const payload = ctx.jwt.decodePayload(token)
    if (!payload || typeof payload.sub !== "string") return null
    const subject = payload.sub.trim()
    return subject || null
  }

  function providerAccountDetections(ctx, authState, accessToken) {
    const email = typeof authState.cachedEmail === "string"
      ? authState.cachedEmail.trim()
      : ""
    if (email) {
      return [{
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        identityKind: "providerEmail",
        identityValue: email,
        identityConfidence: "high",
        label: email,
      }]
    }

    const subject = getTokenSubject(ctx, accessToken)
    if (!subject) return []
    return [{
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      identityKind: "providerUserId",
      identityValue: subject,
      identityConfidence: "high",
    }]
  }

  function persistAccessToken(ctx, source, sourceDbPath, sourcePath, accessToken) {
    if (source === "keychain") {
      return writeKeychainValue(ctx, KEYCHAIN_ACCESS_TOKEN_SERVICE, accessToken)
    }
    return writeStateValue(ctx, sourceDbPath, sourcePath, "cursorAuth/accessToken", accessToken)
  }

  function getTokenExpiration(ctx, token) {
    const payload = ctx.jwt.decodePayload(token)
    if (!payload || typeof payload.exp !== "number") return null
    return payload.exp * 1000 // Convert to milliseconds
  }

  function needsRefresh(ctx, accessToken, nowMs) {
    if (!accessToken) return true
    const expiresAt = getTokenExpiration(ctx, accessToken)
    return ctx.util.needsRefreshByExpiry({
      nowMs,
      expiresAtMs: expiresAt,
      bufferMs: REFRESH_BUFFER_MS,
    })
  }

  function refreshToken(ctx, refreshTokenValue, source, sourceDbPath, sourcePath) {
    if (!refreshTokenValue) {
      ctx.host.log.warn("refresh skipped: no refresh token")
      return null
    }

    ctx.host.log.info("attempting token refresh")
    try {
      const resp = ctx.util.request({
        method: "POST",
        url: REFRESH_URL,
        headers: { "Content-Type": "application/json" },
        bodyText: JSON.stringify({
          grant_type: "refresh_token",
          client_id: CLIENT_ID,
          refresh_token: refreshTokenValue,
        }),
        timeoutMs: 15000,
      })

      if (resp.status === 400 || resp.status === 401) {
        let errorInfo = null
        errorInfo = ctx.util.tryParseJson(resp.bodyText)
        const shouldLogout = errorInfo && errorInfo.shouldLogout === true
        ctx.host.log.error("refresh failed: status=" + resp.status + " shouldLogout=" + shouldLogout)
        if (shouldLogout) {
          throw "Session expired. " + LOGIN_HINT
        }
        throw "Token expired. " + LOGIN_HINT
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

      // Check if server wants us to logout
      if (body.shouldLogout === true) {
        ctx.host.log.error("refresh response indicates shouldLogout=true")
        throw "Session expired. " + LOGIN_HINT
      }

      const newAccessToken = body.access_token
      if (!newAccessToken) {
        ctx.host.log.warn("refresh response missing access_token")
        return null
      }

      // Persist updated access token to source where auth was loaded from.
      persistAccessToken(ctx, source, sourceDbPath, sourcePath, newAccessToken)
      ctx.host.log.info("refresh succeeded, token persisted")

      // Note: Cursor refresh returns access_token which is used as both
      // access and refresh token in some flows
      return newAccessToken
    } catch (e) {
      if (typeof e === "string") throw e
      ctx.host.log.error("refresh exception: " + String(e))
      return null
    }
  }

  function connectPost(ctx, url, token) {
    return ctx.util.request({
      method: "POST",
      url: url,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
      },
      bodyText: "{}",
      timeoutMs: 10000,
    })
  }

  function buildSessionToken(ctx, accessToken) {
    var payload = ctx.jwt.decodePayload(accessToken)
    if (!payload || !payload.sub) return null
    var parts = String(payload.sub).split("|")
    var userId = parts.length > 1 ? parts[1] : parts[0]
    if (!userId) return null
    return { userId: userId, sessionToken: userId + "%3A%3A" + accessToken }
  }

  function fetchRequestBasedUsage(ctx, accessToken) {
    var session = buildSessionToken(ctx, accessToken)
    if (!session) {
      ctx.host.log.warn("request-based: cannot build session token")
      return null
    }
    try {
      var resp = ctx.util.request({
        method: "GET",
        url: REST_USAGE_URL + "?user=" + encodeURIComponent(session.userId),
        headers: {
          Cookie: "WorkosCursorSessionToken=" + session.sessionToken,
        },
        timeoutMs: 10000,
      })
      if (resp.status < 200 || resp.status >= 300) {
        ctx.host.log.warn("request-based usage returned status=" + resp.status)
        return null
      }
      return ctx.util.tryParseJson(resp.bodyText)
    } catch (e) {
      ctx.host.log.warn("request-based usage fetch failed: " + String(e))
      return null
    }
  }

  function fetchStripeBalance(ctx, accessToken) {
    var session = buildSessionToken(ctx, accessToken)
    if (!session) {
      ctx.host.log.warn("stripe: cannot build session token")
      return null
    }
    try {
      var resp = ctx.util.request({
        method: "GET",
        url: STRIPE_URL,
        headers: {
          Cookie: "WorkosCursorSessionToken=" + session.sessionToken,
        },
        timeoutMs: 10000,
      })
      if (resp.status < 200 || resp.status >= 300) {
        ctx.host.log.warn("stripe balance returned status=" + resp.status)
        return null
      }
      var stripe = ctx.util.tryParseJson(resp.bodyText)
      if (!stripe) return null
      var customerBalanceCents = Number(stripe.customerBalance)
      if (!Number.isFinite(customerBalanceCents)) return null
      // Stripe stores customer credits as a negative balance.
      return customerBalanceCents < 0 ? Math.abs(customerBalanceCents) : 0
    } catch (e) {
      ctx.host.log.warn("stripe balance fetch failed: " + String(e))
      return null
    }
  }

  function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null
  }

  function centsToUsd(value) {
    const cents = finiteNumber(value)
    return cents === null ? null : cents / 100
  }

  function setNumber(target, key, value) {
    const n = finiteNumber(value)
    if (n !== null) target[key] = n
  }

  function setUsdFromCents(target, key, value) {
    const usd = centsToUsd(value)
    if (usd !== null) target[key] = usd
  }

  function sampleDay(ctx) {
    const parsed = ctx.util.parseDateMs(ctx.nowIso)
    const date = new Date(Number.isFinite(parsed) ? parsed : Date.now())
    return date.toISOString().slice(0, 10)
  }

  function dayFromMs(value) {
    const n = finiteNumber(value)
    if (n === null) return null
    return new Date(n).toISOString().slice(0, 10)
  }

  function cursorPeriod(usage, fallbackDay) {
    const start = finiteNumber(Number(usage && usage.billingCycleStart))
    const end = finiteNumber(Number(usage && usage.billingCycleEnd))
    if (start !== null && end !== null && end > start) {
      return {
        start,
        end,
        key: "cursor:" + dayFromMs(start) + ":" + dayFromMs(end),
      }
    }
    return {
      start: null,
      end: null,
      key: "cursor:" + fallbackDay,
    }
  }

  function addMetricSample(samples, metricKey, value, unit, day, period, source) {
    const n = finiteNumber(value)
    if (n === null) return
    const sample = {
      metricKey,
      value: n,
      unit,
      sampleDay: day,
      source: source || "providerReported",
    }
    if (period.start !== null) sample.periodStart = period.start
    if (period.end !== null) sample.periodEnd = period.end
    samples.push(sample)
  }

  function extractorVersion() {
    return { cursor: CURSOR_EXTRACTOR_VERSION }
  }

  function metricFamilies(summary) {
    const families = []
    if (summary.tokensTotal !== undefined) families.push("tokens")
    if (summary.estimatedCostUsd !== undefined) families.push("estimatedCost")
    if (summary.budgetUsedUsd !== undefined || summary.budgetLimitUsd !== undefined) families.push("budget")
    if (summary.quotaPercent !== undefined) families.push("quotaPressure")
    if (summary.creditsUsed !== undefined || summary.creditsRemaining !== undefined) families.push("credits")
    if (summary.requestsUsed !== undefined) families.push("requests")
    if (summary.provider && summary.provider.cursor) families.push("cursorPool")
    return families.length > 0 ? families : ["cursor"]
  }

  function buildRequestSourceFacts(ctx, requestUsage, planName) {
    const day = sampleDay(ctx)
    const start = requestUsage && requestUsage.startOfMonth
      ? ctx.util.parseDateMs(requestUsage.startOfMonth)
      : null
    const period = Number.isFinite(start)
      ? {
        start,
        end: start + 30 * 24 * 60 * 60 * 1000,
        key: "cursor:requests:" + dayFromMs(start),
      }
      : { start: null, end: null, key: "cursor:requests:" + day }
    const gpt4 = requestUsage && requestUsage["gpt-4"]
    const used = gpt4 && finiteNumber(gpt4.numRequests) !== null ? gpt4.numRequests : 0
    const limit = gpt4 && finiteNumber(gpt4.maxRequestUsage) !== null ? gpt4.maxRequestUsage : null
    const summary = {
      requestsUsed: used,
      provider: {
        cursor: {},
      },
    }
    if (planName) summary.provider.cursor.planName = planName
    setNumber(summary.provider.cursor, "requestLimit", limit)

    const samples = []
    addMetricSample(samples, "cursor.requests.used", used, "requests", day, period)
    addMetricSample(samples, "cursor.requests.limit", limit, "requests", day, period)

    return {
      periodStart: period.start,
      periodEnd: period.end,
      periodKey: period.key,
      dataIdentity: period.key,
      summary,
      summaryVersion: SUMMARY_VERSION,
      extractorVersion: extractorVersion(),
      metricFamilies: metricFamilies(summary),
      metricSamples: samples,
    }
  }

  function buildCursorSourceFacts(ctx, usage, planName, creditInfo) {
    const day = sampleDay(ctx)
    const period = cursorPeriod(usage, day)
    const pu = usage.planUsage || {}
    const su = usage.spendLimitUsage || {}
    const planUsedUsd = centsToUsd(typeof pu.totalSpend === "number"
      ? pu.totalSpend
      : typeof pu.limit === "number"
        ? pu.limit - (pu.remaining || 0)
        : null)
    const planLimitUsd = centsToUsd(pu.limit)
    const planRemainingUsd = centsToUsd(pu.remaining)
    const totalPercentUsed = finiteNumber(pu.totalPercentUsed) !== null
      ? pu.totalPercentUsed
      : planUsedUsd !== null && planLimitUsd !== null && planLimitUsd > 0
        ? (planUsedUsd / planLimitUsd) * 100
        : null
    const individualLimitUsd = centsToUsd(su.individualLimit)
    const individualUsedUsd = centsToUsd(su.individualUsed)
    const individualRemainingUsd = centsToUsd(su.individualRemaining)
    const pooledLimitUsd = centsToUsd(su.pooledLimit)
    const pooledUsedUsd = centsToUsd(su.pooledUsed)
    const pooledRemainingUsd = centsToUsd(su.pooledRemaining)
    const onDemandLimitUsd = individualLimitUsd !== null ? individualLimitUsd : pooledLimitUsd
    const onDemandRemainingUsd = individualRemainingUsd !== null ? individualRemainingUsd : pooledRemainingUsd
    const onDemandUsedUsd = centsToUsd(su.totalSpend) !== null
      ? centsToUsd(su.totalSpend)
      : individualUsedUsd !== null
        ? individualUsedUsd
        : onDemandLimitUsd !== null && onDemandRemainingUsd !== null
          ? onDemandLimitUsd - onDemandRemainingUsd
          : pooledUsedUsd

    const cursor = {}
    if (planName) cursor.planName = planName
    setNumber(cursor, "planUsedUsd", planUsedUsd)
    setUsdFromCents(cursor, "planLimitUsd", pu.limit)
    setUsdFromCents(cursor, "planRemainingUsd", pu.remaining)
    setNumber(cursor, "planTotalPercentUsed", totalPercentUsed)
    setNumber(cursor, "autoPercentUsed", pu.autoPercentUsed)
    setNumber(cursor, "apiPercentUsed", pu.apiPercentUsed)
    if (typeof su.limitType === "string") cursor.limitType = su.limitType
    setNumber(cursor, "onDemandUsedUsd", onDemandUsedUsd)
    setNumber(cursor, "onDemandLimitUsd", onDemandLimitUsd)
    setNumber(cursor, "onDemandRemainingUsd", onDemandRemainingUsd)
    setNumber(cursor, "individualUsedUsd", individualUsedUsd)
    setNumber(cursor, "individualLimitUsd", individualLimitUsd)
    setNumber(cursor, "individualRemainingUsd", individualRemainingUsd)
    setNumber(cursor, "pooledUsedUsd", pooledUsedUsd)
    setNumber(cursor, "pooledLimitUsd", pooledLimitUsd)
    setNumber(cursor, "pooledRemainingUsd", pooledRemainingUsd)
    if (period.start !== null) cursor.billingCycleStart = period.start
    if (period.end !== null) cursor.billingCycleEnd = period.end

    const summary = {
      provider: { cursor },
    }
    setNumber(summary, "estimatedCostUsd", planUsedUsd)
    setNumber(summary, "budgetUsedUsd", onDemandUsedUsd !== null ? onDemandUsedUsd : planUsedUsd)
    setNumber(summary, "budgetLimitUsd", onDemandLimitUsd !== null ? onDemandLimitUsd : planLimitUsd)
    setNumber(summary, "quotaPercent", totalPercentUsed)
    if (creditInfo && creditInfo.totalUsd !== null && creditInfo.totalUsd > 0) {
      summary.creditsUsed = creditInfo.usedUsd || 0
      summary.creditsRemaining = Math.max(creditInfo.totalUsd - summary.creditsUsed, 0)
    }

    const samples = []
    addMetricSample(samples, "cursor.plan.used", planUsedUsd, "usd", day, period)
    addMetricSample(samples, "cursor.plan.limit", planLimitUsd, "usd", day, period)
    addMetricSample(samples, "cursor.plan.remaining", planRemainingUsd, "usd", day, period)
    addMetricSample(samples, "cursor.plan.percentUsed", totalPercentUsed, "percent", day, period)
    addMetricSample(samples, "cursor.api.percentUsed", pu.apiPercentUsed, "percent", day, period)
    addMetricSample(samples, "cursor.auto.percentUsed", pu.autoPercentUsed, "percent", day, period)
    addMetricSample(samples, "cursor.onDemand.used", onDemandUsedUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.limit", onDemandLimitUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.remaining", onDemandRemainingUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.individual.used", individualUsedUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.individual.limit", individualLimitUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.individual.remaining", individualRemainingUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.pooled.used", pooledUsedUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.pooled.limit", pooledLimitUsd, "usd", day, period)
    addMetricSample(samples, "cursor.onDemand.pooled.remaining", pooledRemainingUsd, "usd", day, period)
    if (individualLimitUsd === null && pooledLimitUsd === null) {
      addMetricSample(samples, "cursor.onDemand.missingLimit", 1, "count", day, period, "normalized")
    }
    if (creditInfo && creditInfo.totalUsd !== null && creditInfo.totalUsd > 0) {
      addMetricSample(samples, "cursor.credits.used", creditInfo.usedUsd || 0, "usd", day, period)
      addMetricSample(samples, "cursor.credits.remaining", summary.creditsRemaining, "usd", day, period)
    }

    return {
      periodStart: period.start,
      periodEnd: period.end,
      periodKey: period.key,
      dataIdentity: period.key,
      summary,
      summaryVersion: SUMMARY_VERSION,
      extractorVersion: extractorVersion(),
      metricFamilies: metricFamilies(summary),
      metricSamples: samples,
    }
  }

  function buildRequestBasedResult(ctx, accessToken, planName, unavailableMessage, detections) {
    var requestUsage = fetchRequestBasedUsage(ctx, accessToken)
    var lines = []

    if (requestUsage) {
      var gpt4 = requestUsage["gpt-4"]
      if (gpt4 && typeof gpt4.maxRequestUsage === "number" && gpt4.maxRequestUsage > 0) {
        var used = gpt4.numRequests || 0
        var limit = gpt4.maxRequestUsage

        var billingPeriodMs = 30 * 24 * 60 * 60 * 1000
        var cycleStart = requestUsage.startOfMonth
          ? ctx.util.parseDateMs(requestUsage.startOfMonth)
          : null
        var cycleEndMs = cycleStart ? cycleStart + billingPeriodMs : null

        lines.push(ctx.line.progress({
          label: "Requests",
          used: used,
          limit: limit,
          format: { kind: "count", suffix: "requests" },
          resetsAt: ctx.util.toIso(cycleEndMs),
          periodDurationMs: billingPeriodMs,
        }))
      }
    }

    if (lines.length === 0) {
      ctx.host.log.warn("request-based: no usage data available")
      throw unavailableMessage
    }

    var plan = null
    if (planName) {
      var planLabel = ctx.fmt.planLabel(planName)
      if (planLabel) plan = planLabel
    }

    return {
      plan: plan,
      lines: lines,
      providerAccountDetections: detections,
      sourceFacts: buildRequestSourceFacts(ctx, requestUsage, planName),
      rawPayload: {
        requestUsage: requestUsage,
        planName: planName || null,
      },
    }
  }

  function buildEnterpriseResult(ctx, accessToken, planName, detections) {
    return buildRequestBasedResult(
      ctx,
      accessToken,
      planName,
      "Enterprise usage data unavailable. Try again later.",
      detections
    )
  }

  function buildTeamRequestBasedResult(ctx, accessToken, planName, detections) {
    return buildRequestBasedResult(
      ctx,
      accessToken,
      planName,
      "Team request-based usage data unavailable. Try again later.",
      detections
    )
  }

  function buildUnknownRequestBasedResult(ctx, accessToken, planName, detections) {
    return buildRequestBasedResult(
      ctx,
      accessToken,
      planName,
      "Cursor request-based usage data unavailable. Try again later.",
      detections
    )
  }

  function probe(ctx) {
    const authState = loadAuthState(ctx)
    let accessToken = authState.accessToken
    const refreshTokenValue = authState.refreshToken
    const authSource = authState.source
    const authSourcePath = authState.sourcePath
    const authSourceText = authSource === "sqlite" && authSourcePath
      ? authSource + " (" + authSourcePath + ")"
      : authSource

    if (!accessToken && !refreshTokenValue) {
      ctx.host.log.error("probe failed: no access or refresh token in sqlite/keychain")
      throw "Not logged in. " + LOGIN_HINT
    }

    ctx.host.log.info("tokens loaded from " + authSourceText + ": accessToken=" + (accessToken ? "yes" : "no") + " refreshToken=" + (refreshTokenValue ? "yes" : "no"))

    const nowMs = Date.now()

    // Proactively refresh if token is expired or about to expire
    if (needsRefresh(ctx, accessToken, nowMs)) {
      ctx.host.log.info("token needs refresh (expired or expiring soon)")
      let refreshed = null
      try {
        refreshed = refreshToken(ctx, refreshTokenValue, authSource, authState.sourceDbPath, authSourcePath)
      } catch (e) {
        // If refresh fails but we have an access token, try it anyway
        ctx.host.log.warn("refresh failed but have access token, will try: " + String(e))
        if (!accessToken) throw e
      }
      if (refreshed) {
        accessToken = refreshed
      } else if (!accessToken) {
        ctx.host.log.error("refresh failed and no access token available")
        throw "Not logged in. " + LOGIN_HINT
      }
    }

    let usageResp
    let didRefresh = false
    try {
      usageResp = ctx.util.retryOnceOnAuth({
        request: (token) => {
          try {
            return connectPost(ctx, USAGE_URL, token || accessToken)
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
          const refreshed = refreshToken(ctx, refreshTokenValue, authSource, authState.sourceDbPath, authSourcePath)
          if (refreshed) accessToken = refreshed
          return refreshed
        },
      })
    } catch (e) {
      if (typeof e === "string") throw e
      ctx.host.log.error("usage request failed: " + String(e))
      throw "Usage request failed. Check your connection."
    }

    if (ctx.util.isAuthStatus(usageResp.status)) {
      ctx.host.log.error("usage returned auth error after all retries: status=" + usageResp.status)
      throw "Token expired. " + LOGIN_HINT
    }

    if (usageResp.status < 200 || usageResp.status >= 300) {
      ctx.host.log.error("usage returned error: status=" + usageResp.status)
      throw "Usage request failed (HTTP " + String(usageResp.status) + "). Try again later."
    }

    ctx.host.log.info("usage fetch succeeded")

    const usage = ctx.util.tryParseJson(usageResp.bodyText)
    if (usage === null) {
      throw "Usage response invalid. Try again later."
    }

    // Fetch plan info early (needed for request-based fallback detection)
    let planName = ""
    let planInfoUnavailable = false
    try {
      const planResp = connectPost(ctx, PLAN_URL, accessToken)
      if (planResp.status >= 200 && planResp.status < 300) {
        const plan = ctx.util.tryParseJson(planResp.bodyText)
        if (plan && plan.planInfo && plan.planInfo.planName) {
          planName = plan.planInfo.planName
        }
      } else {
        planInfoUnavailable = true
        ctx.host.log.warn("plan info returned error: status=" + planResp.status)
      }
    } catch (e) {
      planInfoUnavailable = true
      ctx.host.log.warn("plan info fetch failed: " + String(e))
    }

    const normalizedPlanName = typeof planName === "string"
      ? planName.toLowerCase()
      : ""
    const detections = providerAccountDetections(ctx, authState, accessToken)

    const hasPlanUsage = !!usage.planUsage
    const hasPlanUsageLimit = hasPlanUsage &&
      typeof usage.planUsage.limit === "number" &&
      Number.isFinite(usage.planUsage.limit)
    const planUsageLimitMissing = hasPlanUsage && !hasPlanUsageLimit
    const hasTotalUsagePercent = hasPlanUsage &&
      typeof usage.planUsage.totalPercentUsed === "number" &&
      Number.isFinite(usage.planUsage.totalPercentUsed)

    // Enterprise and some Team request-based accounts can return no planUsage
    // or a planUsage object without limit from the Connect API.
    const needsRequestBasedFallback = usage.enabled !== false && (!hasPlanUsage || planUsageLimitMissing) && (
      normalizedPlanName === "enterprise" ||
      normalizedPlanName === "team"
    )
    if (needsRequestBasedFallback) {
      if (normalizedPlanName === "enterprise") {
        ctx.host.log.info("detected enterprise account, using REST usage API")
        return buildEnterpriseResult(ctx, accessToken, planName, detections)
      }
      ctx.host.log.info("detected team request-based account, using REST usage API")
      return buildTeamRequestBasedResult(ctx, accessToken, planName, detections)
    }

    const needsFallbackWithoutPlanInfo = usage.enabled !== false &&
      (!hasPlanUsage || planUsageLimitMissing) &&
      !hasTotalUsagePercent &&
      !normalizedPlanName &&
      planInfoUnavailable
    if (needsFallbackWithoutPlanInfo) {
      ctx.host.log.info("plan info unavailable with missing planUsage, attempting REST usage API fallback")
      return buildUnknownRequestBasedResult(ctx, accessToken, planName, detections)
    }

    if (usage.enabled !== false && planUsageLimitMissing && !hasTotalUsagePercent) {
      ctx.host.log.warn("planUsage.limit missing, attempting REST usage API fallback")
      try {
        return buildUnknownRequestBasedResult(ctx, accessToken, planName, detections)
      } catch (e) {
        ctx.host.log.warn("REST usage fallback unavailable: " + String(e))
      }
    }

    // Team plans may omit `enabled` even with valid plan usage data.
    if (usage.enabled === false || !usage.planUsage) {
      throw "No active Cursor subscription."
    }

    let creditGrants = null
    try {
      const creditsResp = connectPost(ctx, CREDITS_URL, accessToken)
      if (creditsResp.status >= 200 && creditsResp.status < 300) {
        creditGrants = ctx.util.tryParseJson(creditsResp.bodyText)
      }
    } catch (e) {
      ctx.host.log.warn("credit grants fetch failed: " + String(e))
    }

    const stripeBalanceCents = fetchStripeBalance(ctx, accessToken) || 0

    let plan = null
    if (planName) {
      const planLabel = ctx.fmt.planLabel(planName)
      if (planLabel) {
        plan = planLabel
      }
    }

    const lines = []
    const pu = usage.planUsage

    // Credits first (if available) - highest priority primary metric
    const hasCreditGrants = creditGrants && creditGrants.hasCreditGrants === true
    const grantTotalCents = hasCreditGrants ? parseInt(creditGrants.totalCents, 10) : 0
    const grantUsedCents = hasCreditGrants ? parseInt(creditGrants.usedCents, 10) : 0
    const hasValidGrantData = hasCreditGrants &&
      grantTotalCents > 0 &&
      !isNaN(grantTotalCents) &&
      !isNaN(grantUsedCents)
    const combinedTotalCents = (hasValidGrantData ? grantTotalCents : 0) + stripeBalanceCents

    if (combinedTotalCents > 0) {
      lines.push(ctx.line.progress({
        label: "Credits",
        used: ctx.fmt.dollars(hasValidGrantData ? grantUsedCents : 0),
        limit: ctx.fmt.dollars(combinedTotalCents),
        format: { kind: "dollars" },
      }))
    }

    // Total usage (always present) - fallback primary metric
    if (!hasPlanUsageLimit && !hasTotalUsagePercent) {
      throw "Total usage limit missing from API response."
    }
    const planUsed = hasPlanUsageLimit
      ? (typeof pu.totalSpend === "number"
        ? pu.totalSpend
        : pu.limit - (pu.remaining ?? 0))
      : 0
    const computedPercentUsed = hasPlanUsageLimit && pu.limit > 0
      ? (planUsed / pu.limit) * 100
      : 0
    const totalUsagePercent = hasTotalUsagePercent
      ? pu.totalPercentUsed
      : computedPercentUsed

    // Calculate billing cycle period duration
    var billingPeriodMs = 30 * 24 * 60 * 60 * 1000 // 30 days default
    var cycleStart = Number(usage.billingCycleStart)
    var cycleEnd = Number(usage.billingCycleEnd)
    if (Number.isFinite(cycleStart) && Number.isFinite(cycleEnd) && cycleEnd > cycleStart) {
      billingPeriodMs = cycleEnd - cycleStart // already in ms
    }

    const su = usage.spendLimitUsage
    const isTeamAccount = (
      normalizedPlanName === "team" ||
      (su && su.limitType === "team") ||
      (su && typeof su.pooledLimit === "number")
    )

    if (isTeamAccount) {
      if (!hasPlanUsageLimit) {
        ctx.host.log.warn("team-inferred account missing planUsage.limit, attempting REST usage API fallback")
        return buildUnknownRequestBasedResult(ctx, accessToken, planName, detections)
      }
      lines.push(ctx.line.progress({
        label: "Total usage",
        used: ctx.fmt.dollars(planUsed),
        limit: ctx.fmt.dollars(pu.limit),
        format: { kind: "dollars" },
        resetsAt: ctx.util.toIso(usage.billingCycleEnd),
        periodDurationMs: billingPeriodMs
      }))

      if (typeof pu.bonusSpend === "number" && pu.bonusSpend > 0) {
        lines.push(ctx.line.text({ label: "Bonus spend", value: "$" + String(ctx.fmt.dollars(pu.bonusSpend)) }))
      }
    } else {
      lines.push(ctx.line.progress({
        label: "Total usage",
        used: totalUsagePercent,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: ctx.util.toIso(usage.billingCycleEnd),
        periodDurationMs: billingPeriodMs
      }))
    }

    if (typeof pu.autoPercentUsed === "number" && Number.isFinite(pu.autoPercentUsed)) {
      lines.push(ctx.line.progress({
        label: "Auto usage",
        used: pu.autoPercentUsed,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: ctx.util.toIso(usage.billingCycleEnd),
        periodDurationMs: billingPeriodMs
      }))
    }

    if (typeof pu.apiPercentUsed === "number" && Number.isFinite(pu.apiPercentUsed)) {
      lines.push(ctx.line.progress({
        label: "API usage",
        used: pu.apiPercentUsed,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: ctx.util.toIso(usage.billingCycleEnd),
        periodDurationMs: billingPeriodMs
      }))
    }

    // On-demand (if available) - not a primary candidate
    if (su) {
      const limit = su.individualLimit ?? su.pooledLimit ?? 0
      const remaining = su.individualRemaining ?? su.pooledRemaining ?? 0
      if (limit > 0) {
        const used = limit - remaining
        lines.push(ctx.line.progress({
          label: "On-demand",
          used: ctx.fmt.dollars(used),
          limit: ctx.fmt.dollars(limit),
          format: { kind: "dollars" },
        }))
      }
    }

    return {
      plan: plan,
      lines: lines,
      providerAccountDetections: detections,
      sourceFacts: buildCursorSourceFacts(ctx, usage, planName, {
        usedUsd: centsToUsd(hasValidGrantData ? grantUsedCents : 0),
        totalUsd: centsToUsd(combinedTotalCents),
      }),
      rawPayload: {
        usage: usage,
        planName: planName || null,
        creditGrants: creditGrants,
        stripeBalanceCents: stripeBalanceCents,
      },
    }
  }

  globalThis.__openusage_plugin = { id: "cursor", probe }
})()
