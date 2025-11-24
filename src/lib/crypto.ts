export async function hashPassword(password: string) {
  if (!password) {
    throw new Error('Password is required for hashing.')
  }

  if (!(globalThis.crypto && globalThis.crypto.subtle)) {
    throw new Error('Web Crypto API is not available in this environment.')
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

