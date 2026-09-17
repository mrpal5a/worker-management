import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken, SESSION_TTL_MS } from './session';

const SECRET = 'test-secret-value';

describe('createSessionToken', () => {
  it('produces a payload.signature pair', async () => {
    const token = await createSessionToken(SECRET);
    expect(token.split('.')).toHaveLength(2);
  });

  it('does not produce a guessable constant', async () => {
    const token = await createSessionToken(SECRET);
    expect(token).not.toBe('ok');
    expect(token.length).toBeGreaterThan(40);
  });

  it('produces a different token each time, even within the same millisecond', async () => {
    const [a, b] = await Promise.all([
      createSessionToken(SECRET),
      createSessionToken(SECRET),
    ]);
    expect(a).not.toBe(b);
  });
});

describe('verifySessionToken', () => {
  it('accepts a token it just issued', async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(SECRET, token)).toBe(true);
  });

  it('rejects the old hardcoded value', async () => {
    expect(await verifySessionToken(SECRET, 'ok')).toBe(false);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken('other-secret');
    expect(await verifySessionToken(SECRET, token)).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const token = await createSessionToken(SECRET);
    const [, sig] = token.split('.');
    const farFuture = String(Date.now() + 10 ** 12);
    expect(await verifySessionToken(SECRET, `${farFuture}.${sig}`)).toBe(false);
  });

  it('rejects a tampered signature', async () => {
    const token = await createSessionToken(SECRET);
    const [payload] = token.split('.');
    expect(await verifySessionToken(SECRET, `${payload}.AAAA`)).toBe(false);
  });

  it('rejects an expired token', async () => {
    // Issue a token that expired an hour ago.
    const token = await createSessionToken(SECRET, -60 * 60 * 1000);
    expect(await verifySessionToken(SECRET, token)).toBe(false);
  });

  it('rejects malformed input without throwing', async () => {
    for (const bad of ['', '.', 'nodot', 'a.b.c', 'x.y']) {
      expect(await verifySessionToken(SECRET, bad)).toBe(false);
    }
  });

  it('rejects an empty secret rather than accepting anything', async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken('', token)).toBe(false);
  });
});

describe('SESSION_TTL_MS', () => {
  it('is 30 days', () => {
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
