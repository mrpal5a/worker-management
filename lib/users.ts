import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import type { Role } from './session';

/**
 * Accounts.
 *
 * Supabase Auth stores and verifies passwords; this module never sees a hash
 * and implements no password cryptography. Display name and role live in the
 * app's own `profiles` table, keyed to `auth.users`.
 */

export interface Profile {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  email: string;
}

interface ProfileRow {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  created_at: string;
}

/**
 * Verify an email/password pair. Returns the user id, or null if the
 * credentials are wrong.
 *
 * Callers must not distinguish "no such email" from "wrong password" in
 * anything shown to the user, or the login form becomes a way to discover
 * which addresses have accounts.
 */
export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  // A throwaway client, NOT the shared one.
  //
  // signInWithPassword mutates the client it is called on: afterwards that
  // client sends the signed-in user's JWT instead of the service_role key.
  // Since the migration revokes all privileges from the `authenticated` role,
  // the shared singleton would start failing every query with "permission
  // denied" — for every request in the process, not just this user's.
  //
  // This client is discarded as soon as the check is done.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');

  const authClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;

  const { data: authUser } = await getSupabase().auth.admin.getUserById(userId);
  return { ...data, email: authUser?.user?.email ?? '' };
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .order('created_at');

  if (error) throw new Error(`listProfiles: ${error.message}`);

  const { data: authList } = await getSupabase().auth.admin.listUsers();
  const emails = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? '']));

  return ((data ?? []) as ProfileRow[]).map((p) => ({
    ...p,
    email: emails.get(p.id) ?? '',
  }));
}

export async function createAccount(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await getSupabase().auth.admin.createUser({
    email: input.email,
    password: input.password,
    // No confirmation mail: an admin created this account and vouches for the
    // address. Without this the user could not sign in until they clicked a
    // link in an inbox they may not read.
    email_confirm: true,
  });

  if (error || !data.user) {
    return { error: error?.message ?? 'Could not create the account.' };
  }

  const { error: profileError } = await getSupabase()
    .from('profiles')
    .insert({ id: data.user.id, name: input.name, role: input.role });

  if (profileError) {
    // Roll back, so we never leave a login behind with no profile — that
    // account could sign in but would have no role and no way to get one.
    await getSupabase().auth.admin.deleteUser(data.user.id);
    return { error: `Could not create the profile: ${profileError.message}` };
  }

  return { ok: true };
}

export async function setPassword(userId: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(`setPassword: ${error.message}`);
}

export async function setProfile(
  userId: string,
  changes: { role?: Role; active?: boolean; name?: string },
): Promise<void> {
  const { error } = await getSupabase().from('profiles').update(changes).eq('id', userId);
  if (error) throw new Error(`setProfile: ${error.message}`);
}

/** Number of active admins. Used to refuse the removal of the last one. */
export async function countActiveAdmins(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('active', true);

  if (error) throw new Error(`countActiveAdmins: ${error.message}`);
  return count ?? 0;
}
