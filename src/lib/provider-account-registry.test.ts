import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fingerprintProviderAccount,
  type ProviderAccountIdentityKind,
} from "@/lib/provider-account-fingerprint"
import {
  forgetProviderAccount,
  syncProviderAccountRegistry,
  updateProviderAccountConfirmationState,
  updateProviderAccountLabel,
  updateProviderAccountVisibility,
  type ProviderAccountDetection,
  type ProviderAccountRegistry,
  type ProviderAccountRegistryResult,
} from "@/lib/provider-account-registry"
import {
  getOrCreateProviderAccountLocalSalt,
  loadProviderAccountRegistry,
  saveProviderAccountRegistry,
  syncSavedProviderAccountRegistry,
} from "@/lib/provider-account-registry-store"

const storeState = new Map<string, unknown>()
const storeSaveMock = vi.fn()

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get<T>(key: string): Promise<T | null> {
      if (!storeState.has(key)) return undefined as T | null
      return storeState.get(key) as T | null
    }
    async set<T>(key: string, value: T): Promise<void> {
      storeState.set(key, value)
    }
    async save(): Promise<void> {
      storeSaveMock()
    }
  },
}))

const detectedAt = "2026-06-01T12:00:00.000Z"
const laterDetectedAt = "2026-06-02T12:00:00.000Z"
const localSalt = "desktop-local-salt"

function detection(overrides: Partial<ProviderAccountDetection> = {}): ProviderAccountDetection {
  return {
    providerId: "claude",
    providerName: "Claude",
    identityKind: "providerAccountId" as ProviderAccountIdentityKind,
    identityValue: "acct-work-123",
    identityConfidence: "high",
    localSalt,
    ...overrides,
  }
}

function expectOk<T>(result: ProviderAccountRegistryResult<T>): T {
  expect(result).toMatchObject({ ok: true })
  if (!result.ok) throw new Error(result.message)
  return result.value
}

async function syncedRegistry(
  detectedAccounts: ProviderAccountDetection[],
  registry: ProviderAccountRegistry = { accounts: [] },
  scannedProviderIds = ["claude"],
  seenAt = detectedAt
): Promise<ProviderAccountRegistry> {
  return expectOk(
    await syncProviderAccountRegistry({
      registry,
      detectedAccounts,
      scannedProviderIds,
      detectedAt: seenAt,
    })
  )
}

describe("provider account registry", () => {
  beforeEach(() => {
    storeState.clear()
    storeSaveMock.mockReset()
  })

  it("stores detected provider accounts with local fingerprints", async () => {
    const registry = await syncedRegistry([
      detection({ label: "Work Claude" }),
      detection({ identityValue: "acct-personal-456", label: "Personal Claude" }),
    ])

    const account = registry.accounts[0]
    const expectedFingerprint = await fingerprintProviderAccount({
      providerId: "claude",
      identityKind: "providerAccountId",
      identityValue: "acct-work-123",
      localSalt,
    })

    expect(expectedFingerprint).toMatchObject({ ok: true })
    if (expectedFingerprint.ok) {
      expect(account.localAccountFingerprint).toBe(expectedFingerprint.value.fingerprint)
    }
    expect(account).toMatchObject({
      providerId: "claude",
      label: "Work Claude",
      visibility: "visible",
      identityConfidence: "high",
      confirmationState: "unconfirmed",
      firstSeenAt: detectedAt,
      lastSeenAt: detectedAt,
      detectionState: "detected",
    })
    expect(registry.accounts).toHaveLength(2)
  })

  it("assigns fallback labels by provider first-detected order", async () => {
    const registry = await syncedRegistry([
      detection(),
      detection({ identityValue: "acct-personal-456" }),
      detection({
        providerId: "codex",
        providerName: "Codex",
        identityValue: "acct-codex-789",
      }),
    ])

    expect(registry.accounts.map((account) => account.label)).toEqual([
      "Claude account 1",
      "Claude account 2",
      "Codex account 1",
    ])
  })

  it("preserves local label, visibility, and confirmation on rediscovery", async () => {
    let registry = await syncedRegistry([detection({ label: "Claude account 1" })])
    const fingerprint = registry.accounts[0].localAccountFingerprint

    registry = expectOk(updateProviderAccountLabel(registry, fingerprint, "Work"))
    registry = expectOk(updateProviderAccountVisibility(registry, fingerprint, "hidden"))
    registry = expectOk(
      updateProviderAccountConfirmationState(registry, fingerprint, "confirmed")
    )

    const rediscovered = await syncedRegistry(
      [
        detection({
          label: "Provider supplied label",
          identityConfidence: "medium",
        }),
      ],
      registry,
      ["claude"],
      laterDetectedAt
    )

    expect(rediscovered.accounts[0]).toMatchObject({
      label: "Work",
      visibility: "hidden",
      confirmationState: "confirmed",
      identityConfidence: "medium",
      firstSeenAt: detectedAt,
      lastSeenAt: laterDetectedAt,
      detectionState: "detected",
    })
  })

  it("marks missing scanned provider accounts not detected only for scanned providers", async () => {
    const registry = await syncedRegistry(
      [
        detection({ identityValue: "acct-work-123", label: "Work Claude" }),
        detection({ identityValue: "acct-personal-456", label: "Personal Claude" }),
        detection({
          providerId: "codex",
          providerName: "Codex",
          identityValue: "acct-codex-789",
          label: "Work Codex",
        }),
      ],
      { accounts: [] },
      ["claude", "codex"]
    )

    const next = await syncedRegistry(
      [detection({ identityValue: "acct-work-123", label: "Work Claude" })],
      registry,
      ["claude"],
      laterDetectedAt
    )

    expect(next.accounts.map((account) => [account.label, account.detectionState])).toEqual([
      ["Work Claude", "detected"],
      ["Personal Claude", "notDetected"],
      ["Work Codex", "detected"],
    ])
  })

  it("keeps old account settings when an account fingerprint changes", async () => {
    const registry = await syncedRegistry([detection()])
    const next = await syncedRegistry(
      [detection({ identityValue: "acct-new-999" })],
      registry,
      ["claude"],
      laterDetectedAt
    )

    expect(next.accounts).toHaveLength(2)
    expect(next.accounts[0]).toMatchObject({
      label: "Claude account 1",
      firstSeenAt: detectedAt,
      lastSeenAt: detectedAt,
      detectionState: "notDetected",
    })
    expect(next.accounts[1]).toMatchObject({
      label: "Claude account 2",
      firstSeenAt: laterDetectedAt,
      lastSeenAt: laterDetectedAt,
      detectionState: "detected",
      confirmationState: "unconfirmed",
    })
  })

  it("allows forgetting only not detected accounts", async () => {
    const registry = await syncedRegistry([
      detection({ label: "Work Claude" }),
      detection({ identityValue: "acct-personal-456", label: "Personal Claude" }),
    ])
    const withMissing = await syncedRegistry(
      [detection({ label: "Work Claude" })],
      registry,
      ["claude"],
      laterDetectedAt
    )

    expect(
      forgetProviderAccount(withMissing, withMissing.accounts[0].localAccountFingerprint)
    ).toMatchObject({ ok: false, code: "account-still-detected" })

    const forgotten = expectOk(
      forgetProviderAccount(withMissing, withMissing.accounts[1].localAccountFingerprint)
    )
    expect(forgotten.accounts.map((account) => account.label)).toEqual(["Work Claude"])
  })

  it("persists the local registry", async () => {
    const registry = await syncedRegistry([detection({ label: "Work Claude" })])

    await saveProviderAccountRegistry(registry)

    expect(storeState.get("providerAccountRegistry")).toEqual(registry)
    await expect(loadProviderAccountRegistry()).resolves.toEqual(registry)
    expect(storeSaveMock).toHaveBeenCalledTimes(1)
  })

  it("creates and reuses the persistent local salt", async () => {
    const first = await getOrCreateProviderAccountLocalSalt()
    const second = await getOrCreateProviderAccountLocalSalt()

    expect(first).toEqual(expect.any(String))
    expect(first.length).toBeGreaterThan(0)
    expect(second).toBe(first)
    expect(storeState.get("providerAccountLocalSalt")).toBe(first)
    expect(storeSaveMock).toHaveBeenCalledTimes(1)
  })

  it("syncs and saves the persisted local registry", async () => {
    const result = await syncSavedProviderAccountRegistry({
      detectedAccounts: [detection({ label: "Work Claude" })],
      scannedProviderIds: ["claude"],
      detectedAt,
    })

    const registry = expectOk(result)
    expect(storeState.get("providerAccountRegistry")).toEqual(registry)
    expect(storeSaveMock).toHaveBeenCalledTimes(1)
  })

  it("returns explicit errors for invalid expected inputs", async () => {
    await expect(
      syncProviderAccountRegistry({
        registry: { accounts: [] },
        detectedAccounts: [],
        scannedProviderIds: ["claude"],
        detectedAt: " ",
      })
    ).resolves.toMatchObject({ ok: false, code: "detected-at-required" })

    await expect(
      syncProviderAccountRegistry({
        registry: { accounts: [] },
        detectedAccounts: [
          detection({
            identityConfidence: "unknown" as ProviderAccountDetection["identityConfidence"],
          }),
        ],
        scannedProviderIds: ["claude"],
        detectedAt,
      })
    ).resolves.toMatchObject({ ok: false, code: "identity-confidence-invalid" })

    expect(updateProviderAccountLabel({ accounts: [] }, " ", "Name")).toMatchObject({
      ok: false,
      code: "local-account-fingerprint-required",
    })
    expect(updateProviderAccountVisibility({ accounts: [] }, "missing", "visible"))
      .toMatchObject({ ok: false, code: "account-not-found" })
    expect(
      updateProviderAccountConfirmationState(
        { accounts: [] },
        "missing",
        "invalid" as "confirmed"
      )
    ).toMatchObject({ ok: false, code: "confirmation-state-invalid" })
  })
})
