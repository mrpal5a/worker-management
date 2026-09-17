import { describe, it, expect } from 'vitest';
import { isAdmin, canManageUsers, assertAdmin } from './auth';
import type { Session } from './session';

const admin: Session = { userId: 'a', role: 'admin', expiresAt: Date.now() + 1000 };
const user: Session = { userId: 'u', role: 'user', expiresAt: Date.now() + 1000 };

describe('isAdmin', () => {
  it('is true for an admin session', () => expect(isAdmin(admin)).toBe(true));
  it('is false for a user session', () => expect(isAdmin(user)).toBe(false));
  it('is false for no session', () => expect(isAdmin(null)).toBe(false));
});

describe('canManageUsers', () => {
  it('allows admins', () => expect(canManageUsers(admin)).toBe(true));
  it('denies ordinary users', () => expect(canManageUsers(user)).toBe(false));
  it('denies anonymous', () => expect(canManageUsers(null)).toBe(false));
});

describe('assertAdmin', () => {
  it('returns the session for an admin', () => {
    expect(assertAdmin(admin)).toBe(admin);
  });

  it('throws for an ordinary user', () => {
    expect(() => assertAdmin(user)).toThrow(/admin/i);
  });

  it('throws for anonymous', () => {
    expect(() => assertAdmin(null)).toThrow(/admin/i);
  });

  it('throws rather than returning a falsy session', () => {
    // Guards against a refactor that returns null instead of throwing, which
    // would make every caller silently unauthenticated-but-allowed.
    let threw = false;
    try {
      assertAdmin(null);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
