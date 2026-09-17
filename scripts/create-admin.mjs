import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

/**
 * Seed the first admin account.
 *
 * Chicken-and-egg: only an admin can create accounts through the app, and to
 * begin with there are none. This script uses the service_role key directly to
 * break that cycle. Run it once, then manage everyone else from the Users
 * screen.
 *
 *   node scripts/create-admin.mjs you@example.com "a-strong-password" "Your Name"
 */

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> [name]');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error || !data?.user) {
  console.error('Could not create the user:', error?.message ?? 'unknown error');
  process.exit(1);
}

const { error: profileError } = await db
  .from('profiles')
  .insert({ id: data.user.id, name: name ?? 'Admin', role: 'admin' });

if (profileError) {
  // Roll back so a login is never left behind without a profile.
  await db.auth.admin.deleteUser(data.user.id);
  console.error('Could not create the profile:', profileError.message);
  console.error('Did you apply supabase/migrations/0002_profiles.sql?');
  process.exit(1);
}

console.log(`Admin account created: ${email}`);
