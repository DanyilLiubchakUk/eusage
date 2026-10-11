import { describe, expect, it } from "vitest"
import { checkInDevice, disconnectDevice } from "./desktopApiCore"
import { ingestUsageBatch } from "./usageIngestCore"
import { createDesktopApiTestStore } from "../test/convex/desktopApiHelpers"
import {
  createUsageIngestTestStore,
  mockUsageProvider,
  usageBatch,
  usageIngestTestNow as now,
} from "../test/convex/usageIngestHelpers"

describe("developer device ownership", () => {
  it("rejects disconnect and usage upload for another developer's installation", async () => {
    const fake = await createUsageIngestTestStore()
    fake.devices[0].developerId = "developer-other"
    const desktop = await createDesktopApiTestStore({ devices: fake.devices })
    const initialDevices = structuredClone(fake.devices)
    const initialTokens = structuredClone(fake.tokens)
    const initialDevelopers = structuredClone(fake.developers)

    const disconnect = await disconnectDevice({
      input: { tokenHash: fake.tokenHash, deviceId: "device-1" },
      now,
      store: desktop.store,
    })
    const upload = await ingestUsageBatch({
      input: { tokenHash: fake.tokenHash, batch: usageBatch([mockUsageProvider()]) },
      now,
      store: fake.store,
    })

    for (const result of [disconnect, upload]) {
      expect(result).toMatchObject({ ok: false, code: "device-not-found" })
    }
    expect(fake.devices).toEqual(initialDevices)
    expect(fake.tokens).toEqual(initialTokens)
    expect(desktop.tokens[0].lastUsedAt).toBeUndefined()
    expect(fake.developers).toEqual(initialDevelopers)
    expect(fake.rawPayloads).toHaveLength(0)
    expect(fake.usageSnapshots).toHaveLength(0)
    expect(fake.metricSamples).toHaveLength(0)
    expect(fake.syncErrors).toHaveLength(0)
  })

  it.each(["connected", "stale", "disconnected", "archived"] as const)(
    "rejects taking over another developer's %s installation through check-in",
    async (status) => {
      const fake = await createUsageIngestTestStore()
      fake.devices[0].developerId = "developer-other"
      fake.devices[0].status = status
      const desktop = await createDesktopApiTestStore({ devices: fake.devices })
      const initialDevices = structuredClone(fake.devices)
      const initialDevelopers = structuredClone(desktop.developers)
      const initialTokens = structuredClone(desktop.tokens)

      const result = await checkInDevice({
        input: { tokenHash: fake.tokenHash, deviceId: "device-1", os: "macos", appVersion: "0.6.29" },
        now,
        store: desktop.store,
      })

      expect(result).toMatchObject({ ok: false, code: "device-owner-conflict" })
      expect(fake.devices).toEqual(initialDevices)
      expect(desktop.developers).toEqual(initialDevelopers)
      expect(desktop.tokens).toEqual(initialTokens)
    }
  )

  it("registers a fresh ID after disconnect without moving the previous owner's device", async () => {
    const fake = await createUsageIngestTestStore()
    fake.devices[0].developerId = "developer-other"
    const desktop = await createDesktopApiTestStore({ devices: fake.devices })
    const previousDevice = structuredClone(fake.devices[0])

    const result = await checkInDevice({
      input: { tokenHash: fake.tokenHash, deviceId: "device-new", os: "macos", appVersion: "0.6.29" },
      now,
      store: desktop.store,
    })

    expect(result.ok).toBe(true)
    expect(desktop.devices).toHaveLength(2)
    expect(fake.devices).toHaveLength(1)
    expect(fake.devices[0]).toEqual(previousDevice)
    expect(desktop.devices[1]).toMatchObject({ developerId: "developer-1", status: "connected" })
  })
})
