import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  readSessionToken,
  SESSION_TTL_MS,
} from './session';

const SECRET = 'test-secret-value';

describe('createSessionToken', () => {
  it('produces a payload.signature pair', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    expect(token.split('.')).toHaveLength(2);
  });

  it('does not produce a guessable constant', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    expect(token).not.toBe('ok');
    expect(token.length).toBeGreaterThan(40);
  });

  it('produces a different token each time, even within the same millisecond', async () => {
    const [a, b] = await Promise.all([
      createSessionToken(SECRET, { userId: 'u1', role: 'user' }),
      createSessionToken(SECRET, { userId: 'u1', role: 'user' }),
    ]);
    expect(a).not.toBe(b);
  });
});

describe('verifySessionToken', () => {
  it('accepts a token it just issued', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    expect(await verifySessionToken(SECRET, token)).toBe(true);
  });

  it('rejects the old hardcoded value', async () => {
    expect(await verifySessionToken(SECRET, 'ok')).toBe(false);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken('other-secret', { userId: 'u1', role: 'user' });
    expect(await verifySessionToken(SECRET, token)).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    const [, sig] = token.split('.');
    const farFuture = String(Date.now() + 10 ** 12);
    expect(await verifySessionToken(SECRET, `${farFuture}.${sig}`)).toBe(false);
  });

  it('rejects a tampered signature', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    const [payload] = token.split('.');
    expect(await verifySessionToken(SECRET, `${payload}.AAAA`)).toBe(false);
  });

  it('rejects an expired token', async () => {
    // Issue a token that expired an hour ago.
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' }, -60 * 60 * 1000);
    expect(await verifySessionToken(SECRET, token)).toBe(false);
  });

  it('rejects malformed input without throwing', async () => {
    for (const bad of ['', '.', 'nodot', 'a.b.c', 'x.y']) {
      expect(await verifySessionToken(SECRET, bad)).toBe(false);
    }
  });

  it('rejects an empty secret rather than accepting anything', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    expect(await verifySessionToken('', token)).toBe(false);
  });
});

describe('SESSION_TTL_MS', () => {
  it('is 7 days', () => {
    expect(SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('session payload', () => {
  it('round-trips userId and role', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'admin' });
    const session = await readSessionToken(SECRET, token);
    expect(session).toEqual(
      expect.objectContaining({ userId: 'u1', role: 'admin' }),
    );
  });

  it('round-trips a userId containing a uuid', async () => {
    const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
    const token = await createSessionToken(SECRET, { userId: id, role: 'user' });
    expect((await readSessionToken(SECRET, token))?.userId).toBe(id);
  });

  it('returns null when the role has been tampered with', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    const [payload, sig] = token.split('.');
    const forged = payload.replace(':user:', ':admin:');
    expect(await readSessionToken(SECRET, `${forged}.${sig}`)).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' }, -1000);
    expect(await readSessionToken(SECRET, token)).toBeNull();
  });

  it('returns null for an unknown role value', async () => {
    const token = await createSessionToken(SECRET, {
      userId: 'u1',
      role: 'root' as unknown as 'admin',
    });
    expect(await readSessionToken(SECRET, token)).toBeNull();
  });

  it('returns null for the old constant cookie', async () => {
    expect(await readSessionToken(SECRET, 'ok')).toBeNull();
  });

  it('returns null for a token signed with another secret', async () => {
    const token = await createSessionToken('other', { userId: 'u1', role: 'admin' });
    expect(await readSessionToken(SECRET, token)).toBeNull();
  });
});
