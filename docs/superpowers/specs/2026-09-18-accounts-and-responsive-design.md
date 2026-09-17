# Accounts and Responsive Layout — Design

**Date:** 2026-09-18
**Status:** Approved
**Supersedes:** the shared-password gate described in
`2026-09-18-worker-management-design.md`

## Problem

Two gaps block real use.

**Accounts.** The app has one shared password. Everyone who knows it is the same
anonymous user. The contractor's manager needs his own account, created for him,
and there is no way to revoke access short of changing the password for
everybody.

**Mobile.** The manager records attendance from his phone at the work site. The
current layout is a desktop table; on a phone it requires horizontal scrolling
while tapping dropdowns, and the worker's name scrolls out of view as you edit
his row.

## Scope

In scope: email/password accounts backed by Supabase Auth, an admin-only user
management screen, role-based authorisation, logout, and a mobile-first layout
across every screen.

Out of scope: self-service signup, password reset emails, multi-factor auth,
per-user data partitioning, and audit logging of who changed what.

## Accounts

### Engine

Supabase Auth stores and verifies passwords. The application never sees a
password hash and implements no password cryptography of its own. This is
deliberate: the one authentication defect this codebase has had — a forgeable
constant session cookie — came from hand-written auth code.

### Data

Supabase owns `auth.users`. The app adds one table:

```
profiles  id (uuid, references auth.users on delete cascade)
          name  text
          role  text  check (role in ('admin','user'))
          active boolean default true
          created_at timestamptz
```

Data is **shared, not partitioned**. Every account sees the same workers,
companies, and entries. This is one contractor's book with two people working
it, not separate tenants.

### Account creation

Self-signup is disabled in Supabase project settings. Accounts exist only
because an admin created them, through `supabase.auth.admin.createUser()` using
the `service_role` key. There is no public registration path to find.

### Recovery

If a user forgets a password, an admin sets a new one from the Users screen.
There are no reset emails, so recovery does not depend on the user having a
working mailbox — a real constraint for the intended users.

### Sessions

Login calls `signInWithPassword()` server-side. On success the app issues its
own HMAC-signed cookie, the mechanism already used for the shared-password gate.
The signed payload carries expiry, `userId`, and `role`.

Supabase Auth is therefore the password store; the app's own cookie is the
session. `proxy.ts` verifies that cookie locally with no network round trip and
no database read, which keeps the Edge proxy fast.

**Session lifetime is 7 days**, reduced from 30.

This is the acknowledged trade-off of verifying sessions offline: a signed
cookie remains valid until it expires, so deleting an account does not instantly
terminate an active session. Seven days bounds the exposure. Rotating
`SESSION_SECRET` invalidates every outstanding session immediately and serves as
a "sign everyone out now" control. Instant per-user revocation would require a
database read on every request, which is not worth it for two users.

### Authorisation

Two roles:

- **admin** — everything, plus managing accounts.
- **user** — everything operational: attendance, workers, companies, and all
  reports including bill rates and margin.

The distinction is account management only. The manager does the billing
calculations, so he needs to see margin.

`proxy.ts` gates authenticated versus anonymous, and additionally requires
`role === 'admin'` for `/users`.

**Every admin server action re-checks the role itself.** The proxy guards page
navigation, but a server action can be invoked directly over HTTP without ever
passing through it. The check inside the action is the real security boundary;
the proxy check is a redirect for good user experience.

## Responsive layout

Mobile-first. Layout is written for a phone and widened at breakpoints, rather
than a desktop layout patched for small screens.

### Attendance

The high-volume screen, and the one used on a phone. Below the `sm` breakpoint
each worker becomes a two-line row: name on its own line, company selector and
overtime field beneath it, separated by a divider. At `sm` and above it remains
the existing table.

This keeps the worker's name visible while his row is being edited, gives
full-width tap targets, and eliminates horizontal scrolling — while staying
dense enough to work through roughly 70 workers.

### Reports

Report tables stay tables. Each is wrapped in an `overflow-x-auto` container so
a wide table scrolls within its own box and never forces the page body to scroll
sideways.

### Navigation

The nav becomes a horizontally scrollable strip on small screens rather than
wrapping to three lines and pushing content below the fold.

### Touch targets

Interactive controls are at least 44px on their smallest dimension.

## Error handling

- Wrong email or password returns one message — "Wrong email or password" —
  without revealing which was wrong, so the form cannot be used to enumerate
  valid accounts.
- Creating an account with an existing email reports the conflict plainly.
- An admin cannot deactivate or demote their own account, which would otherwise
  make it possible to lock every admin out of the system.
- An expired or tampered session cookie is deleted and the user is sent to
  `/login`.

## Testing

Session token tests extend to cover `userId` and `role` surviving a
round trip, and that a token whose role has been altered fails verification —
the property that stops a user promoting themselves to admin by editing a
cookie.

Authorisation helpers are pure functions over a decoded session and are unit
tested directly.

Supabase Auth calls are exercised by hand rather than mocked; mocking an
authentication provider mostly tests the mock.

## Open questions

None blocking.
