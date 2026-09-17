# Accounts and Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared-password gate with real per-user accounts backed by Supabase Auth, and make every screen usable on a phone.

**Architecture:** Supabase Auth verifies passwords. The app issues its own HMAC-signed cookie carrying `userId`, `role`, and expiry, verified locally by `proxy.ts` with no network call. Admin-only actions re-check the role server-side. Layout is mobile-first Tailwind.

**Tech Stack:** Existing — Next.js 16, Supabase JS, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-18-accounts-and-responsive-design.md`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `lib/session.ts` | Signed tokens now carry `userId` + `role` | modify |
| `lib/auth.ts` | Pure authorisation predicates over a session | create |
| `lib/users.ts` | Supabase Auth admin calls + profiles queries | create |
| `app/actions/auth.ts` | Login via Supabase, logout | modify |
| `app/actions/users.ts` | Admin-only account management actions | create |
| `app/users/page.tsx` | Admin user management screen | create |
| `proxy.ts` | Role-aware gate | modify |
| `supabase/migrations/0002_profiles.sql` | profiles table + RLS | create |

---

### Task 1: Session tokens carry identity and role

**Files:** modify `lib/session.ts`, `lib/session.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `lib/session.test.ts`:

```typescript
import { createSessionToken, readSessionToken } from './session';

describe('session payload', () => {
  it('round-trips userId and role', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'admin' });
    const session = await readSessionToken(SECRET, token);
    expect(session).toEqual(expect.objectContaining({ userId: 'u1', role: 'admin' }));
  });

  it('returns null for a tampered role', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' });
    const [payload, sig] = token.split('.');
    const forged = payload.replace(':user:', ':admin:');
    expect(await readSessionToken(SECRET, `${forged}.${sig}`)).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'user' }, -1000);
    expect(await readSessionToken(SECRET, token)).toBeNull();
  });

  it('rejects an unknown role value', async () => {
    const token = await createSessionToken(SECRET, { userId: 'u1', role: 'root' as never });
    expect(await readSessionToken(SECRET, token)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run lib/session.test.ts`
Expected: FAIL — `readSessionToken` is not exported.

- [ ] **Step 3: Implement**

Change the payload from `<expiry>:<nonce>` to `<expiry>:<role>:<userId>:<nonce>` and add:

```typescript
export type Role = 'admin' | 'user';

export interface Session {
  userId: string;
  role: Role;
  expiresAt: number;
}

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

/** Verify and decode. Returns null for anything invalid. */
export async function readSessionToken(secret: string, token: string): Promise<Session | null> {
  if (!(await verifySessionToken(secret, token))) return null;

  const [payload] = token.split('.');
  const [expiryRaw, role, userId] = payload.split(':');
  if (role !== 'admin' && role !== 'user') return null;
  if (!userId) return null;

  return { userId, role, expiresAt: Number(expiryRaw) };
}
```

`verifySessionToken` keeps its existing signature and expiry checks.

- [ ] **Step 4: Confirm pass**

Run: `npx vitest run lib/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/session.ts lib/session.test.ts
git commit -m "feat: carry userId and role in the session token"
```

---

### Task 2: Authorisation predicates

**Files:** create `lib/auth.ts`, `lib/auth.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
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
  it('returns the session for an admin', () => expect(assertAdmin(admin)).toBe(admin));
  it('throws for a user', () => expect(() => assertAdmin(user)).toThrow(/admin/i));
  it('throws for anonymous', () => expect(() => assertAdmin(null)).toThrow(/admin/i));
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run lib/auth.test.ts`
Expected: FAIL — cannot resolve `./auth`.

- [ ] **Step 3: Implement `lib/auth.ts`**

```typescript
import type { Session } from './session';

export function isAdmin(session: Session | null): boolean {
  return session?.role === 'admin';
}

export function canManageUsers(session: Session | null): boolean {
  return isAdmin(session);
}

/**
 * Throws unless the session is an admin. Called at the top of every admin
 * server action: the proxy only guards navigation, and a server action can be
 * invoked directly over HTTP without passing through it.
 */
export function assertAdmin(session: Session | null): Session {
  if (!isAdmin(session)) throw new Error('Forbidden: admin role required.');
  return session as Session;
}
```

- [ ] **Step 4: Confirm pass, then commit**

```bash
npx vitest run lib/auth.test.ts
git add lib/auth.ts lib/auth.test.ts
git commit -m "feat: add authorisation predicates"
```

---

### Task 3: Profiles migration

**Files:** create `supabase/migrations/0002_profiles.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Accounts: Supabase owns auth.users; this adds role and display name.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  role       text not null default 'user' check (role in ('admin', 'user')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
```

- [ ] **Step 2: Apply it**

Supabase → SQL Editor → paste → Run.

- [ ] **Step 3: Disable self-signup**

Supabase → Authentication → Sign In / Providers → Email → turn **off**
"Allow new users to sign up". Without this, anyone can register at the
Supabase API directly regardless of what the app shows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_profiles.sql
git commit -m "feat: add profiles table for account roles"
```

---

### Task 4: User repository

**Files:** create `lib/users.ts`

- [ ] **Step 1: Implement**

```typescript
import 'server-only';
import { getSupabase } from './supabase';
import type { Role } from './session';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  email: string;
}

/** Verify an email/password pair. Returns the user id, or null. */
export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;

  const { data: authUser } = await getSupabase().auth.admin.getUserById(userId);
  return { ...data, email: authUser?.user?.email ?? '' };
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabase().from('profiles').select('*').order('created_at');
  if (error) throw new Error(`listProfiles: ${error.message}`);

  const { data: authList } = await getSupabase().auth.admin.listUsers();
  const emails = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? '']));
  return (data ?? []).map((p) => ({ ...p, email: emails.get(p.id) ?? '' }));
}

export async function createAccount(input: {
  email: string; password: string; name: string; role: Role;
}): Promise<{ error: string } | { ok: true }> {
  const { data, error } = await getSupabase().auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // no confirmation mail; admin vouches for the address
  });
  if (error || !data.user) return { error: error?.message ?? 'Could not create the account.' };

  const { error: pErr } = await getSupabase()
    .from('profiles')
    .insert({ id: data.user.id, name: input.name, role: input.role });

  if (pErr) {
    // Roll back so we never leave a login with no profile behind it.
    await getSupabase().auth.admin.deleteUser(data.user.id);
    return { error: `Could not create the profile: ${pErr.message}` };
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
```

- [ ] **Step 2: Typecheck and commit**

```bash
npx tsc --noEmit
git add lib/users.ts
git commit -m "feat: add user repository over Supabase Auth"
```

---

### Task 5: Login and session wiring

**Files:** modify `app/actions/auth.ts`, `app/login/login-form.tsx`, `proxy.ts`; create `lib/current-user.ts`

- [ ] **Step 1: Rewrite `app/actions/auth.ts`**

```typescript
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, sessionSecret, SESSION_TTL_MS } from '@/lib/session';
import { verifyCredentials, getProfile } from '@/lib/users';

const SESSION_COOKIE = 'wm_session';

export async function login(formData: FormData): Promise<{ error: string } | undefined> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Email and password are required.' };

  const secret = sessionSecret();
  if (!secret) return { error: 'No session secret configured on the server.' };

  const userId = await verifyCredentials(email, password);
  // One message for both cases, so the form cannot be used to discover
  // which email addresses have accounts.
  if (!userId) return { error: 'Wrong email or password.' };

  const profile = await getProfile(userId);
  if (!profile || !profile.active) return { error: 'Wrong email or password.' };

  const token = await createSessionToken(secret, { userId, role: profile.role });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });

  redirect('/attendance');
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}
```

- [ ] **Step 2: Create `lib/current-user.ts`**

```typescript
import 'server-only';
import { cookies } from 'next/headers';
import { readSessionToken, sessionSecret, type Session } from './session';

/** The session for the current request, or null. */
export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get('wm_session')?.value;
  if (!token) return null;
  return readSessionToken(sessionSecret(), token);
}
```

- [ ] **Step 3: Update `proxy.ts` to be role-aware**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { readSessionToken, sessionSecret } from '@/lib/session';

const SESSION_COOKIE = 'wm_session';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? '';
  const session = token ? await readSessionToken(sessionSecret(), token) : null;
  const path = request.nextUrl.pathname;
  const onLogin = path === '/login';

  if (!session && !onLogin) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  if (session && onLogin) {
    return NextResponse.redirect(new URL('/attendance', request.url));
  }
  // Redirect non-admins away from /users. The real check lives in the
  // server actions; this is for user experience.
  if (session && path.startsWith('/users') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/attendance', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 4: Update the login form to take an email**

In `app/login/login-form.tsx`, add above the password input:

```tsx
<input
  name="email"
  type="email"
  placeholder="Email"
  required
  autoFocus
  autoComplete="username"
  className="w-full rounded border px-3 py-2"
/>
```

and change the password input to `autoComplete="current-password"` and remove its `autoFocus`.

- [ ] **Step 5: Verify and commit**

```bash
npm test && npx tsc --noEmit && npm run build
git add -A
git commit -m "feat: authenticate against Supabase Auth with role-aware sessions"
```

---

### Task 6: Seed the first admin

**Files:** create `scripts/create-admin.mjs`

Chicken-and-egg: only an admin can create accounts, and there are none.

- [ ] **Step 1: Write the script**

```javascript
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [email, password, name] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> [name]');
  process.exit(1);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await db.auth.admin.createUser({
  email, password, email_confirm: true,
});
if (error) { console.error('Could not create user:', error.message); process.exit(1); }

const { error: pErr } = await db.from('profiles')
  .insert({ id: data.user.id, name: name ?? 'Admin', role: 'admin' });
if (pErr) { console.error('Could not create profile:', pErr.message); process.exit(1); }

console.log(`Admin created: ${email}`);
```

- [ ] **Step 2: Run it**

```bash
node scripts/create-admin.mjs you@example.com "a-strong-password" "Your Name"
```

Expected: `Admin created: you@example.com`

- [ ] **Step 3: Commit**

```bash
git add scripts/create-admin.mjs
git commit -m "chore: add script to seed the first admin account"
```

---

### Task 7: User management screen

**Files:** create `app/actions/users.ts`, `app/users/page.tsx`, `app/users/user-form.tsx`

- [ ] **Step 1: Write `app/actions/users.ts`**

Every action begins with `assertAdmin`.

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { currentSession } from '@/lib/current-user';
import { assertAdmin } from '@/lib/auth';
import * as users from '@/lib/users';
import type { Role } from '@/lib/session';

export type UserResult = { ok: true } | { error: string };

export async function addUser(formData: FormData): Promise<UserResult> {
  // The proxy can be bypassed by calling this action directly, so the
  // authorisation check must live here.
  assertAdmin(await currentSession());

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const role = String(formData.get('role') ?? 'user') as Role;

  if (!email) return { error: 'Email is required.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (role !== 'admin' && role !== 'user') return { error: 'Invalid role.' };

  const result = await users.createAccount({ email, password, name, role });
  if ('error' in result) return result;

  revalidatePath('/users');
  return { ok: true };
}

export async function resetPassword(userId: string, formData: FormData): Promise<UserResult> {
  assertAdmin(await currentSession());

  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  await users.setPassword(userId, password);
  return { ok: true };
}

export async function toggleUser(userId: string, active: boolean): Promise<UserResult> {
  const session = assertAdmin(await currentSession());
  // Without this an admin could lock themselves — and possibly everyone — out.
  if (session.userId === userId) return { error: 'You cannot deactivate your own account.' };

  await users.setProfile(userId, { active });
  revalidatePath('/users');
  return { ok: true };
}

export async function changeRole(userId: string, role: Role): Promise<UserResult> {
  const session = assertAdmin(await currentSession());
  if (session.userId === userId) return { error: 'You cannot change your own role.' };

  await users.setProfile(userId, { role });
  revalidatePath('/users');
  return { ok: true };
}
```

- [ ] **Step 2: Write `app/users/page.tsx`**

Lists accounts with email, name, role, status, and per-row controls, plus the
add form. Mark it `export const dynamic = 'force-dynamic'`.

```tsx
import { listProfiles } from '@/lib/users';
import { currentSession } from '@/lib/current-user';
import { toggleUser } from '@/app/actions/users';
import { UserForm } from './user-form';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [profiles, session] = await Promise.all([listProfiles(), currentSession()]);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-1 text-2xl font-semibold">Users</h1>
      <p className="mb-6 text-sm text-gray-500">
        Accounts can only be created here. Nobody can sign up on their own.
      </p>

      <UserForm />

      <ul className="divide-y">
        {profiles.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.name || p.email}</div>
              <div className="truncate text-sm text-gray-500">{p.email}</div>
            </div>
            <span className="rounded bg-gray-100 px-2 py-1 text-xs">{p.role}</span>
            {session?.userId !== p.id && (
              <form action={toggleUser.bind(null, p.id, !p.active)}>
                <button className="min-h-11 text-sm text-blue-600 underline">
                  {p.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Write `app/users/user-form.tsx`**

A client component mirroring `worker-form.tsx`: email, name, password, role
select, calling `addUser` and displaying `result.error`.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npm run build
git add -A
git commit -m "feat: add admin user management screen"
```

---

### Task 8: Navigation with logout and role awareness

**Files:** modify `app/layout.tsx`; create `app/nav.tsx`

- [ ] **Step 1: Create `app/nav.tsx`**

```tsx
import Link from 'next/link';
import { currentSession } from '@/lib/current-user';
import { logout } from '@/app/actions/auth';

export async function Nav() {
  const session = await currentSession();
  if (!session) return null;

  const links: [string, string][] = [
    ['/attendance', 'Attendance'],
    ['/workers', 'Workers'],
    ['/companies', 'Companies'],
    ['/reports/worker', 'Worker'],
    ['/reports/company', 'Company'],
    ['/reports/summary', 'Summary'],
  ];
  if (session.role === 'admin') links.push(['/users', 'Users']);

  return (
    <nav className="border-b bg-gray-50">
      {/* Scrolls sideways on a phone rather than wrapping to three lines. */}
      <div className="mx-auto flex max-w-4xl items-center gap-4 overflow-x-auto whitespace-nowrap p-4 text-sm">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="shrink-0 hover:underline">
            {label}
          </Link>
        ))}
        <form action={logout} className="ml-auto shrink-0">
          <button className="text-gray-500 hover:underline">Log out</button>
        </form>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Use it in `app/layout.tsx`**

Replace the inline `<nav>` with `<Nav />`, imported from `./nav`.

- [ ] **Step 3: Commit**

```bash
git add app/nav.tsx app/layout.tsx
git commit -m "feat: role-aware navigation with logout"
```

---

### Task 9: Responsive attendance

**Files:** modify `app/attendance/attendance-row.tsx`, `app/attendance/page.tsx`

- [ ] **Step 1: Convert the row to render both layouts**

Replace the `<tr>` with a `<li>` that is a two-line block on mobile and a
grid row from `sm:` upward, so one component serves both:

```tsx
<li className="border-b py-3 sm:grid sm:grid-cols-[1fr_2fr_6rem] sm:items-center sm:gap-3 sm:py-2">
  <div className="mb-2 font-medium sm:mb-0">
    {workerName}
    {error && <div className="text-xs font-normal text-red-600">{error}</div>}
  </div>
  <div className="flex gap-2">
    <select
      value={companyId}
      onChange={(e) => onCompanyChange(e.target.value)}
      className="min-h-11 flex-1 rounded border px-2 py-1"
    >
      <option value="">— Absent —</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
    <input
      type="number" step="0.5" min="0" max="24"
      value={ot}
      disabled={!companyId}
      onChange={(e) => setOt(e.target.value)}
      onBlur={(e) => onOtCommit(e.target.value)}
      aria-label={`Overtime hours for ${workerName}`}
      className="min-h-11 w-20 rounded border px-2 py-1 disabled:bg-gray-100 sm:w-full"
    />
  </div>
</li>
```

- [ ] **Step 2: Replace the table in `page.tsx` with a list**

```tsx
<ul className="border-t">
  {workers.map((w) => { /* ...AttendanceRow as before... */ })}
</ul>
```

Remove `<table>`, `<thead>`, `<tbody>`. Add a header row visible only at `sm:`
and above:

```tsx
<div className="hidden border-b pb-2 text-sm font-medium text-gray-500 sm:grid sm:grid-cols-[1fr_2fr_6rem] sm:gap-3">
  <div>Worker</div><div>Company</div><div>OT hrs</div>
</div>
```

- [ ] **Step 3: Verify at 375px**

Run `npm run dev`, open `/attendance`, and use the browser device toolbar at
375px wide. Expected: no horizontal page scrolling, the worker name stays
visible while choosing a company, and controls are at least 44px tall.

- [ ] **Step 4: Commit**

```bash
git add app/attendance
git commit -m "feat: responsive attendance entry"
```

---

### Task 10: Responsive reports and registers

**Files:** modify the three report pages, `app/workers/page.tsx`, `app/companies/page.tsx`

- [ ] **Step 1: Wrap every report table**

For each of `app/reports/worker/page.tsx`, `app/reports/company/page.tsx`, and
both tables in `app/reports/summary/page.tsx`, wrap the `<table>`:

```tsx
<div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
  <table className="w-full min-w-[32rem] text-left text-sm">
    …
  </table>
</div>
```

`min-w` keeps columns readable; the wrapper scrolls instead of the page body.

- [ ] **Step 2: Make the summary tiles stack**

They already use `sm:grid-cols-3`; confirm the container is `grid gap-4` so a
phone shows one tile per line.

- [ ] **Step 3: Reduce page padding on small screens**

Change `p-6` to `p-4 sm:p-6` on every `<main>`.

- [ ] **Step 4: Verify at 375px**

Check each screen. Expected: no page-level horizontal scrolling anywhere;
report tables scroll within their own box.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "feat: responsive reports and registers"
```

---

### Task 11: Documentation

**Files:** modify `README.md`, `.env.example`

- [ ] **Step 1: Replace the shared-password section of the README**

Document: accounts are created by an admin; signup is disabled; first admin is
seeded with `scripts/create-admin.mjs`; sessions last 7 days; rotating
`SESSION_SECRET` signs everyone out.

- [ ] **Step 2: Remove `APP_PASSWORD` from `.env.example`**

It is no longer used. `SESSION_SECRET` becomes required rather than optional,
since there is no password left to fall back to.

- [ ] **Step 3: Make `sessionSecret()` require SESSION_SECRET**

In `lib/session.ts`, drop the `APP_PASSWORD` fallback:

```typescript
export function sessionSecret(): string {
  return process.env.SESSION_SECRET || '';
}
```

- [ ] **Step 4: Final verification**

```bash
npm test && npx tsc --noEmit && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: document accounts and require SESSION_SECRET"
```

---

## Self-Review

**Spec coverage:** Supabase Auth engine → Tasks 4, 5. profiles table → Task 3.
Signup disabled → Task 3 Step 3. Admin creates accounts → Task 7. Admin resets
passwords → Task 7. Shared data → unchanged, no partitioning added. Session
carries userId/role, 7-day TTL → Task 1. Proxy gates role, actions re-check →
Tasks 5, 7. Self-lockout prevention → Task 7. Identical error for wrong
email/password → Task 5. Mobile attendance two-line row → Task 9. Report tables
scroll in their own box → Task 10. Nav scrolls sideways → Task 8. 44px targets →
Tasks 7, 9. Tests for role tampering → Task 1. All covered.

**Type consistency:** `Role` and `Session` are defined in Task 1 and used under
those names in Tasks 2, 4, 5, 7. `readSessionToken` is introduced in Task 1 and
consumed in Tasks 5 and 8 via `currentSession`. `Profile` is defined in Task 4
and consumed in Task 7.

**Known deviation from strict TDD:** Tasks 3 through 11 are UI, migration, and
Supabase Auth integration, verified by hand and by build rather than unit tests.
The logic that must be correct — token signing, role decoding, and authorisation
predicates — is covered by tests in Tasks 1 and 2. Mocking Supabase Auth would
mostly test the mock.
