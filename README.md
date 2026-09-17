# Worker Management

Tracks which worker went to which company each day, and produces month-end
worker payroll and company billing, including overtime.

Built for a labour contractor who supplies workers to several companies and
needs two numbers at month end: what to pay each worker, and what to collect
from each company.

## How it works

- Each **worker** has a daily pay rate — what he is paid for one full day.
- Each **company** has a daily bill rate — what it is charged for one man-day.
- The difference is the contractor's margin.

One attendance row means one worker worked one full day at one company.
Absence is the absence of a row. A worker is at exactly one company per day,
enforced by a unique constraint on `(date, worker_id)`.

Overtime carries no premium — an OT hour is the plain hourly equivalent of the
daily rate:

```
pay    = pay_rate  + ot_hours × (pay_rate  ÷ 8)
bill   = bill_rate + ot_hours × (bill_rate ÷ 8)
margin = bill − pay
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
| Companies | Company register and bill rates |
| Worker Report | One worker, one month: every day, company, OT, pay, total |
| Company Report | One company, one month: every day, who came, OT, billed, total |
| Summary | All worker payouts, all company receivables, margin |

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
| `APP_PASSWORD` | Any password you choose; it gates the app |

Apply the schema: open `supabase/migrations/0001_init.sql`, paste it into the
Supabase **SQL Editor**, and run it.

```bash
npm run dev
```

### Why the service_role key

The migration enables Row Level Security with no policies, which denies the
`anon` and `authenticated` roles all access. Without that, anyone holding the
public anon key could read and write payroll data through Supabase's
auto-generated REST API.

The app uses the `service_role` key, which bypasses RLS by design. That key is
server-only: it carries no `NEXT_PUBLIC_` prefix, and `lib/supabase.ts` imports
`server-only`, so importing it from a client component fails the build rather
than leaking the key to the browser.

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

45 tests covering the payroll math, aggregation, date handling, and numeric
conversion — including a reconciliation invariant asserting that total pay plus
total margin equals total billing. If the worker-wise and company-wise reports
ever disagree, that test fails.
