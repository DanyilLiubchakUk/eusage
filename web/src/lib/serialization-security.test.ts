import { describe, expect, it, vi } from "vitest"
import {
  createPlugin,
  fromJSON,
  SerovalDeserializationError,
  toJSON,
  toJSONAsync,
} from "seroval"

describe("Seroval security fixes", () => {
  it("rejects an array-like object as a TypedArray buffer", () => {
    const input = new Uint8Array(8)
    const payload = toJSON(input)
    expect(fromJSON(payload)).toEqual(input)

    // Seroval 1.6.3 capped the node length but still accepted this source.
    payload.t.f = { ...toJSON({ length: 8 }).t, i: 1 }

    expect(() => fromJSON(payload)).toThrow(SerovalDeserializationError)
  })

  it("rejects a plugin thenable before a Promise invokes its callable", async () => {
    const marker = {}
    const then = vi.fn()
    const deserialize = vi.fn(() => ({ then }))
    const plugin = createPlugin<unknown, {}>({
      tag: "audit/thenable",
      test: (value) => value === marker,
      parse: { sync: () => ({}) },
      serialize: () => "{}",
      deserialize,
    })
    const payload = await toJSONAsync(Promise.resolve("safe"))
    expect(await fromJSON(payload)).toBe("safe")
    payload.t.f = { ...toJSON(marker, { plugins: [plugin] }).t, i: 1 }

    expect(() => fromJSON(payload, { plugins: [plugin] })).toThrow(
      SerovalDeserializationError,
    )
    expect(deserialize).toHaveBeenCalledOnce()
    await Promise.resolve()
    expect(then).not.toHaveBeenCalled()
  })
})
