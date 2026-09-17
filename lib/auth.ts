import type { Session } from './session';

/**
 * Authorisation predicates.
 *
 * Pure functions over a decoded session, with no I/O, so authorisation rules
 * can be tested exhaustively and read at a glance.
 */

export function isAdmin(session: Session | null): boolean {
  return session?.role === 'admin';
}

export function canManageUsers(session: Session | null): boolean {
  return isAdmin(session);
}

/**
 * Throws unless the session belongs to an admin.
 *
 * Called at the top of every admin server action. The proxy only guards page
 * navigation — a server action can be invoked directly over HTTP without ever
 * passing through it, so this is the real authorisation boundary.
 */
export function assertAdmin(session: Session | null): Session {
  if (!isAdmin(session)) throw new Error('Forbidden: admin role required.');
  return session as Session;
}
