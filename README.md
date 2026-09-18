# Worker Management

Tracks which worker went to which company each day, and produces month-end
worker payroll and company billing, including overtime.

Built for a labour contractor who supplies workers to several companies and
needs two numbers at month end: what to pay each worker, and what to collect
from each company.

## How it works

- Each **worker** has a daily pay rate — what he is paid for one full day.
- A **company** has no rate of its own. What it owes for a man-day is exactly
  what the worker who came was paid that day — the contractor is a
  pass-through, not a markup, so there is no separate bill rate and no margin.

One attendance row means one worker worked one full day at one company.
Absence is the absence of a row. A worker is at exactly one company per day,
enforced by a unique constraint on `(date, worker_id)`.

Overtime carries no premium — an OT hour is the plain hourly equivalent of the
daily rate:

```
pay  = pay_rate + ot_hours × (pay_rate ÷ 8)
bill = pay
```

### Rate snapshots

Every attendance row stores the rates in force when it was recorded, and all
reporting reads those snapshots rather than the current rate.

Without this, raising a worker's rate on the 20th would silently recalculate the
first 19 days of the month, and figures already sent to a company would change
retroactively.

### Money is never a float

All monetary values use `Decimal`. Binary floats cannot represent decimal
fractions exactly, and across ~2,100 entries a month that error accumulates into
totals that do not reconcile. `lib/num.ts` is the single boundary where a value
from the database becomes a `Decimal`.

## Screens

| Screen | Purpose |
|---|---|
| Attendance | Pick a date, assign each worker a company and OT hours |
| Workers | Worker register and pay rates |
| Companies | Company register |
| Worker Report | One worker, one month: every day, company, OT, pay, total |
| Company Report | One company, one month: every day, who came, OT, billed, total |
| Summary | All worker payouts, all company receivables |

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` → Reveal |
| `SESSION_SECRET` | Required. Signs session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |

Apply the schema. Open each file in `supabase/migrations/` in order, paste it
into the Supabase **SQL Editor**, and run it:

1. `0001_init.sql` — workers, companies, attendance
2. `0002_profiles.sql` — accounts
3. `0003_remove_bill_rate.sql` — drops the company bill rate; billing now mirrors worker pay

Then **turn off self-signup**: Supabase → Authentication → Sign In / Providers →
Email → disable "Allow new users to sign up". Without this, anyone can register
against the Supabase API directly, no matter what the app's screens allow.

Create the first admin account — only an admin can create accounts through the
app, so this breaks the chicken-and-egg:

```bash
node scripts/create-admin.mjs you@example.com "a-strong-password" "Your Name"
```

```bash
npm run dev
```

## Accounts

Everyone has their own account. There are two roles:

- **admin** — everything, plus managing accounts.
- **user** — everything operational: attendance, registers, and all reports.

Accounts are created only by an admin, from the **Users** screen. Self-signup is
disabled, so there is no public registration path.

There are no password-reset emails. If someone forgets their password, an admin
sets a new one from the Users screen — recovery does not depend on them having a
mailbox they actually read.

An admin cannot deactivate or demote their own account, and the last active
admin cannot be removed. Both would otherwise lock everyone out permanently.

### Sessions

Supabase Auth verifies passwords; the app issues its own HMAC-signed cookie as
the session. The signed payload carries the user id and role, so `proxy.ts` can
authorise a request with no database read, and a user cannot promote themselves
to admin by editing the cookie — altering the role invalidates the signature.

The token is deliberately not a constant. An earlier version stored the literal
string `ok`, which meant anyone could forge a session by setting that cookie by
hand — a complete authentication bypass, since the value was public in the
source.

**Sessions last 7 days.** Because they are verified offline, a signed cookie
stays valid until it expires: deactivating an account does not kill a session
already in flight. Seven days bounds that. Changing `SESSION_SECRET` invalidates
every outstanding session immediately, and is the "sign everyone out now"
control.

The proxy guards page navigation. The authoritative permission check lives
inside each admin server action, because a server action can be invoked directly
over HTTP without passing through the proxy.

### Why the service_role key

The migration enables Row Level Security with no policies, which denies the
`anon` and `authenticated` roles all access. Without that, anyone holding the
public anon key could read and write payroll data through Supabase's
auto-generated REST API.

The app uses the `service_role` key, which bypasses RLS by design. That key is
server-only: it carries no `NEXT_PUBLIC_` prefix, and `lib/supabase.ts` imports
`server-only`, so importing it from a client component fails the build rather
than leaking the key to the browser.

## Theming

Light is the default. The device's `prefers-color-scheme` is deliberately
ignored — dark is used only when the user picks it.

The chosen theme is stored in a **cookie**, not `localStorage`. Every page here
is `force-dynamic` and server-rendered, so a theme applied by client-side
JavaScript would paint light and then correct itself — a visible flash on every
navigation, not just the first load. Reading the cookie on the server puts
`class="dark"` on `<html>` in the first byte of HTML instead.

Colours are semantic tokens declared once in `app/globals.css`, with a light set
on `:root` and a dark set under `.dark` — `--surface`, `--border`, `--text`,
`--accent` and so on. To change a colour, edit that one file; nothing else
hard-codes a hex value.

Density follows the breakpoint: interactive controls are 36–44px tall on phones,
where a mis-tap picks the wrong company and bills the wrong client, and tighten
to spreadsheet density from `sm:` up where a pointer makes precision free.

Below `sm` the navigation collapses into a hamburger drawer; above it, the
horizontal bar remains.

## Architecture

All money calculation lives in `lib/payroll.ts` as pure functions with no
database access. That is the code which must be correct, and purity lets it be
tested exhaustively without fixtures. Everything else is arranged around it.

| File | Responsibility |
|---|---|
| `lib/payroll.ts` | Money math. Pure. |
| `lib/reports.ts` | Month-end aggregation. Pure. |
| `lib/date.ts` | UTC-safe calendar dates. |
| `lib/num.ts` | Database value → `Decimal` boundary. |
| `lib/repo.ts` | Every Supabase query. |
| `lib/session.ts` | HMAC-signed session tokens. |
| `lib/auth.ts` | Authorisation predicates. Pure. |
| `lib/users.ts` | Accounts, over Supabase Auth. |
| `lib/theme.ts` | Theme resolution. Pure. |
| `components/ui/` | Shared buttons, fields, tables. |
| `app/actions/` | Server actions. |

That boundary was tested in practice: the database layer was replaced wholesale
(Prisma → Supabase) and the payroll and date modules needed no changes, with
their tests passing untouched.

Dates are stored as Postgres `DATE` and handled only through `lib/date.ts`,
which uses UTC getters exclusively. Local-time getters would shift a date by a
day west of UTC and misfile attendance.

## Tests

```bash
npm test
```

85 tests covering the payroll math, aggregation, date handling, numeric
conversion, session signing, authorisation, and theme resolution.

Two are worth knowing about. A reconciliation invariant asserts that total pay
plus total margin equals total billing — if the worker-wise and company-wise
reports ever disagree, it fails. And the session suite asserts that the old
forgeable cookie value `ok` is rejected, and that a token whose role has been
edited fails verification — so neither bypass can silently return.
