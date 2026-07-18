/**
 * Client-safe UUID v4 generator.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost).
 * When the app is opened over plain HTTP on a LAN IP — a phone on the same
 * Wi-Fi during a demo — it is undefined and throws, silently breaking any
 * form that needs an idempotency key. This falls back to `crypto.getRandomValues`
 * (widely available) and finally to Math.random, so it always returns a UUID.
 */
export function uuid(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;

  if (cryptoObj?.randomUUID !== undefined) {
    return cryptoObj.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoObj?.getRandomValues !== undefined) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Set the version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
