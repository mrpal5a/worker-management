# Worker Management — Design

**Date:** 2026-09-18
**Status:** Approved

## Problem

A labour contractor supplies workers to multiple companies. Roughly 70 workers
across 10 companies. Each day, each worker is sent to one company. At month end
two questions must be answered:

1. **Worker-wise** — what do we pay each worker, including overtime?
2. **Company-wise** — what do we bill each company for the labour it used?

Today this is done by hand. The app replaces that calculation and provides
day-wise drill-down for both views.

## Scope

In scope: worker and company registers, daily attendance capture, overtime,
worker-wise and company-wise month-end reports, margin.

Out of scope for this version: advances and deductions, multiple sites per
company, attendance approval workflow, invoice PDF generation, multi-user
accounts, and per-worker skill categories.

## Rate model

Two independent rates, both flat:

- Each **worker** has a daily `pay_rate` — what we pay him for a full day.
- Each **company** has a daily `bill_rate` — what we charge for one man-day.

The contractor's margin is the difference. Rates do not vary by skill category
or by worker-company pair; this was chosen deliberately to keep setup to two
numbers per record.

## Calculation

A standard day is `standard_hours`, default 8, stored in settings.

```
pay    = pay_rate  + ot_hours × (pay_rate  ÷ standard_hours)
bill   = bill_rate + ot_hours × (bill_rate ÷ standard_hours)
margin = bill − pay
```

Overtime carries no premium multiplier — an OT hour is paid at the plain hourly
equivalent of the daily rate.

Presence of an `Entry` row means the worker worked a full day. Absence is
recorded as no row at all; there is no half-day concept.

## Data model

```
Worker    id, name, phone?, pay_rate, active, created_at
Company   id, name, bill_rate, active, created_at
Entry     id, date, worker_id, company_id, ot_hours,
          pay_rate_snapshot, bill_rate_snapshot, created_at
          UNIQUE (date, worker_id)
Settings  standard_hours (default 8)
```

### Rate snapshots

Every `Entry` stores the rates that were in force when it was recorded, and all
reporting reads the snapshot — never the current rate on `Worker` or `Company`.

Without this, raising a worker's rate on the 20th would silently recalculate the
first 19 days of the month, and reports already sent to a company would change
retroactively. Snapshots make every past report immutable and reproducible.

### Money representation

All monetary values and `ot_hours` use `Decimal`, never floating point. Binary
floats cannot represent decimal fractions exactly, and across ~2,100 entries a
month the rounding error accumulates into totals that do not reconcile.

### One worker, one company, per day

Enforced by `UNIQUE (date, worker_id)`. Reassigning a worker edits the existing
row rather than inserting a second one.

### Soft deletion

Workers and companies are deactivated via the `active` flag, never hard-deleted.
Hard deletion would orphan historical entries and corrupt closed months.
Inactive records are hidden from attendance entry but still appear in reports
covering periods when they were active.

## Screens

| Screen | Purpose |
|---|---|
| Workers | Add/edit workers and pay rates |
| Companies | Add/edit companies and bill rates |
| Daily Attendance | Pick a date, assign each worker a company and OT hours |
| Worker Report | Worker + month → day-wise company, OT, pay; monthly total |
| Company Report | Company + month → day-wise workers, OT, bill; monthly total |
| Monthly Summary | All worker payouts, all company receivables, total margin |

Daily Attendance is the high-volume screen: about 2,100 entries a month pass
through it, so it is optimised for speed. The default action is assigning a
company; OT is only touched when it applies.

## Architecture

Next.js (App Router) with Prisma against Postgres, deployed on Vercel with Neon.
All free tier.

The one boundary that matters is `lib/payroll.ts`: every money calculation lives
there as **pure functions taking plain values and returning plain values, with no
database access**. That is the code which must be correct, and purity lets it be
tested exhaustively without a database or fixtures. Prisma queries, server
actions, and React components are plumbing arranged around it.

Authentication is a single shared password and a session cookie. There is one
user; account management would be unused complexity.

## Error handling

- Duplicate `(worker, date)` is rejected by the database constraint. The UI
  detects it and offers to reassign the existing entry instead.
- Attempting to deactivate a worker or company does not affect existing entries.
- Reports over a month with no entries render an empty state, not an error.

## Testing

Unit tests against `lib/payroll.ts`, covering: full day with no OT, fractional
OT hours, zero rates, and confirmation that reporting uses snapshots rather than
current rates.

Integration tests assert the reconciliation invariant: for any given month, the
sum of all worker payouts plus total margin equals the sum of all company
billings. If worker-wise and company-wise reports disagree, that is the bug this
test catches.

## Open questions

None blocking. Deferred items are listed under Scope.
