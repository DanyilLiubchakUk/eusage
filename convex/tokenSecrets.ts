export function generateSecret(prefix: string, bytes: Uint8Array<ArrayBufferLike> = randomBytes(32)) {
  return `${prefix}_${bytesToBase64Url(bytes)}`
}

export async function hashSecret(rawSecret: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawSecret)
  )

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

export function fingerprintSecretHash(secretHash: string) {
  return `${secretHash.slice(0, 8)}...${secretHash.slice(-8)}`
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array<ArrayBufferLike>) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}
