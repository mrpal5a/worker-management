/**
 * Signed session tokens.
 *
 * The session cookie previously held the constant string 'ok', which meant
 * anyone could forge a session by setting that cookie by hand — a complete
 * authentication bypass. The cookie now holds an HMAC-signed, expiring token
 * that only the server can produce and that the proxy verifies on every
 * request.
 *
 * Uses Web Crypto rather than node:crypto because proxy.ts runs on the Edge
 * runtime, where node:crypto is unavailable.
 */

const encoder = new TextEncoder();

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Issue a token of the form `<payload>.<signature>`, where payload is
 * `<expiryMs>:<nonce>`. The nonce makes each token unique even when two are
 * issued in the same millisecond.
 */
export async function createSessionToken(
  secret: string,
  ttlMs: number = SESSION_TTL_MS,
): Promise<string> {
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const payload = `${Date.now() + ttlMs}:${nonce}`;
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

/**
 * Verify signature and expiry. Returns false for anything malformed rather
 * than throwing, so a hostile cookie cannot crash the proxy.
 */
export async function verifySessionToken(secret: string, token: string): Promise<boolean> {
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  if (!payload || !signature) return false;

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return false;

  // crypto.subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    signatureBytes as BufferSource,
    encoder.encode(payload),
  );
  if (!valid) return false;

  const expiry = Number(payload.split(':')[0]);
  return Number.isFinite(expiry) && expiry > Date.now();
}

/**
 * The key used to sign sessions. A dedicated SESSION_SECRET is preferred;
 * falling back to APP_PASSWORD keeps existing deployments working without new
 * configuration, and has the useful property that changing the app password
 * invalidates every outstanding session.
 */
export function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.APP_PASSWORD || '';
}
