/**
 * Signed session tokens.
 *
 * The cookie holds an HMAC-signed, expiring token that only the server can
 * produce. It previously held the constant string 'ok', which meant anyone
 * could forge a session by setting that cookie by hand — a complete
 * authentication bypass.
 *
 * The signed payload carries the user's identity and role, so the proxy can
 * authorise a request without a database read, and a user cannot promote
 * themselves to admin by editing the cookie — altering the role invalidates
 * the signature.
 *
 * Uses Web Crypto rather than node:crypto because proxy.ts runs on the Edge
 * runtime, where node:crypto is unavailable.
 */

const encoder = new TextEncoder();

/**
 * Seven days. A signed token is verified offline, so it stays valid until it
 * expires: deactivating an account does not terminate a session already in
 * flight. Seven days bounds that exposure. Rotating SESSION_SECRET invalidates
 * every outstanding session immediately.
 */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Role = 'admin' | 'user';

export interface Session {
  userId: string;
  role: Role;
  expiresAt: number;
}

function isRole(value: string): value is Role {
  return value === 'admin' || value === 'user';
}

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
 * `<expiryMs>:<role>:<userId>:<nonce>`. The nonce makes each token unique even
 * when two are issued within the same millisecond.
 */
export async function createSessionToken(
  secret: string,
  identity: { userId: string; role: Role },
  ttlMs: number = SESSION_TTL_MS,
): Promise<string> {
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const payload = `${Date.now() + ttlMs}:${identity.role}:${identity.userId}:${nonce}`;
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
 * Verify and decode a token into a Session. Returns null for anything that
 * fails verification, has expired, or carries a role this app does not define.
 */
export async function readSessionToken(secret: string, token: string): Promise<Session | null> {
  if (!(await verifySessionToken(secret, token))) return null;

  const payload = token.split('.')[0];
  const [expiryRaw, role, userId] = payload.split(':');

  if (!role || !isRole(role)) return null;
  if (!userId) return null;

  return { userId, role, expiresAt: Number(expiryRaw) };
}

/**
 * The key used to sign sessions.
 *
 * Required — there is no fallback. Passwords now live in Supabase Auth, so
 * there is no shared app password to derive a key from, and silently signing
 * with an empty secret would accept forged cookies.
 */
export function sessionSecret(): string {
  return process.env.SESSION_SECRET || '';
}
