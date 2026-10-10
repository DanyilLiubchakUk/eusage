import type { JsonObject } from "./usageIngestTypes"

const exactSecretNames = new Set([
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "apikey",
  "accesskey",
  "secretkey",
  "key",
  "cookie",
  "cookies",
  "csrf",
  "authorization",
  "password",
  "credential",
  "credentials",
])
const secretSuffixes = [
  "token",
  "secret",
  "apikey",
  "accesskey",
  "secretkey",
  "cookie",
  "password",
  "credential",
]

export function findUnredactedSecretPath(
  value: unknown,
  prefix = "payload"
): string | null {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findUnredactedSecretPath(item, `${prefix}.${index}`)
      if (found) return found
    }
    return null
  }

  if (!isRecord(value)) return null

  for (const [key, child] of Object.entries(value)) {
    const path = `${prefix}.${key}`
    if (isSecretFieldName(key) && !isRedactedSecretValue(child)) return path

    const found = findUnredactedSecretPath(child, path)
    if (found) return found
  }

  return null
}

function isSecretFieldName(key: string) {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  return (
    exactSecretNames.has(normalized) ||
    secretSuffixes.some((suffix) => normalized.endsWith(suffix))
  )
}

function isRedactedSecretValue(value: unknown) {
  if (value === null) return true
  if (typeof value === "string") return value.trim().toLowerCase() === "[redacted]"
  return isRecord(value) && value.redacted === true && Object.keys(value).length === 1
}

function isRecord(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
