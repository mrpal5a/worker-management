# Worker Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that records which worker went to which company each day, and produces month-end worker-wise payroll and company-wise billing reports with overtime.

**Architecture:** Next.js App Router with server actions for all mutations. All money calculation lives in `lib/payroll.ts` as pure functions with no database access, so it can be tested exhaustively without fixtures. Prisma talks to Postgres. Every attendance row snapshots the rates in force at entry time, so historical reports never change.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Prisma, Postgres (Neon), Vitest, Tailwind CSS, decimal.js, deployed on Vercel.

---

## Domain Rules (read before starting)

Standard day is 8 hours (`standard_hours`, configurable).

```
pay    = pay_rate  + ot_hours × (pay_rate  ÷ standard_hours)
bill   = bill_rate + ot_hours × (bill_rate ÷ standard_hours)
margin = bill − pay
```

- A worker is at exactly **one** company per day. Enforced by `UNIQUE (date, worker_id)`.
- An attendance row means a **full day worked**. Absence = no row. No half days.
- Reports read `pay_rate_snapshot` / `bill_rate_snapshot` from the entry, **never** the current rate on Worker/Company.
- All money is `Decimal`. Never `number`.

## File Structure

| File | Responsibility |
|---|---|
| `lib/payroll.ts` | Pure money math. No imports from Prisma or Next. |
| `lib/date.ts` | UTC-safe date helpers. Prevents timezone off-by-one. |
| `lib/db.ts` | Prisma client singleton. |
| `lib/reports.ts` | Report queries + aggregation. Uses payroll.ts. |
| `app/actions/workers.ts` | Worker create/update/deactivate server actions. |
| `app/actions/companies.ts` | Company server actions. |
| `app/actions/attendance.ts` | Attendance upsert/delete server actions. |
| `prisma/schema.prisma` | Data model. |
| `app/workers/page.tsx` | Worker register UI. |
| `app/companies/page.tsx` | Company register UI. |
| `app/attendance/page.tsx` | Daily attendance entry (high-volume screen). |
| `app/reports/worker/page.tsx` | Worker-wise monthly report. |
| `app/reports/company/page.tsx` | Company-wise monthly report. |
| `app/reports/summary/page.tsx` | Monthly summary + margin. |

---

### Task 1: Scaffold project and test runner

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Scaffold Next.js**

Run in the project root:

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*" --no-turbopack --yes
```

If it refuses because the directory is not empty, that is expected — the repo already has `.gitignore`, `docs/`, and `.claude-flow/`. Answer yes to proceed; it will not delete those.

- [ ] **Step 2: Install runtime and test dependencies**

```bash
npm install prisma @prisma/client decimal.js
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Add test script to `package.json`**

Add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify the toolchain runs**

Run: `npm test`
Expected: exits successfully reporting "No test files found" (this is a pass — it proves Vitest is wired up).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: UTC-safe date helpers

Postgres `DATE` columns come back through Prisma as JS `Date` objects set to UTC midnight. Using local-time getters like `getDate()` on those returns the **previous day** for anyone east or west of UTC. Every date operation in this app must go through these helpers.

**Files:**
- Create: `lib/date.ts`
- Test: `lib/date.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { toDateKey, fromDateKey, monthRange, daysInMonth } from './date';

describe('toDateKey', () => {
  it('formats a UTC-midnight date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date('2026-09-18T00:00:00Z'))).toBe('2026-09-18');
  });

  it('does not shift the day for late-UTC times', () => {
    expect(toDateKey(new Date('2026-09-18T23:59:59Z'))).toBe('2026-09-18');
  });
});

describe('fromDateKey', () => {
  it('parses to UTC midnight', () => {
    expect(fromDateKey('2026-09-18').toISOString()).toBe('2026-09-18T00:00:00.000Z');
  });

  it('round-trips with toDateKey', () => {
    expect(toDateKey(fromDateKey('2026-02-29'))).toBe('2026-02-29');
  });
});

describe('monthRange', () => {
  it('returns first day and first day of next month', () => {
    const { start, end } = monthRange(2026, 9);
    expect(start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('rolls over the year in December', () => {
    const { end } = monthRange(2026, 12);
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('daysInMonth', () => {
  it('handles 30-day months', () => {
    expect(daysInMonth(2026, 9)).toBe(30);
  });

  it('handles February in a leap year', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/date.test.ts`
Expected: FAIL — cannot resolve `./date`.

- [ ] **Step 3: Implement `lib/date.ts`**

```typescript
/**
 * All dates in this app are calendar dates with no time component.
 * They are represented as UTC-midnight Date objects, or as 'YYYY-MM-DD' strings.
 * Never use local-time getters (getDate/getMonth) on them.
 */

export function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Half-open range [start, end) covering the given month. month is 1-12. */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/date.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/date.ts lib/date.test.ts
git commit -m "feat: add UTC-safe date helpers"
```

---

### Task 3: Payroll calculation (the core)

This is the code that must be correct. Pure functions, no database.

**Files:**
- Create: `lib/payroll.ts`
- Test: `lib/payroll.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calcPay, calcBill, calcMargin, calcEntry, STANDARD_HOURS } from './payroll';

const d = (v: string | number) => new Decimal(v);

describe('calcPay', () => {
  it('pays exactly the day rate when there is no overtime', () => {
    expect(calcPay(d(600), d(0)).toString()).toBe('600');
  });

  it('adds plain hourly for each overtime hour', () => {
    // 600/8 = 75 per hour; 2 hours OT = 150
    expect(calcPay(d(600), d(2)).toString()).toBe('750');
  });

  it('handles fractional overtime hours', () => {
    // 600/8 = 75; 1.5h = 112.5
    expect(calcPay(d(600), d(1.5)).toString()).toBe('712.5');
  });

  it('does not lose precision on rates that do not divide evenly', () => {
    // 500/8 = 62.5; 3h = 187.5 -> 687.5
    expect(calcPay(d(500), d(3)).toString()).toBe('687.5');
  });

  it('returns zero for a zero rate', () => {
    expect(calcPay(d(0), d(5)).toString()).toBe('0');
  });
});

describe('calcBill', () => {
  it('uses the same formula with the bill rate', () => {
    expect(calcBill(d(800), d(2)).toString()).toBe('1000');
  });
});

describe('calcMargin', () => {
  it('is bill minus pay', () => {
    expect(calcMargin(d(1000), d(750)).toString()).toBe('250');
  });

  it('can be negative when billing below cost', () => {
    expect(calcMargin(d(500), d(600)).toString()).toBe('-100');
  });
});

describe('calcEntry', () => {
  it('computes pay, bill and margin together from snapshots', () => {
    const r = calcEntry({ payRate: d(600), billRate: d(800), otHours: d(2) });
    expect(r.pay.toString()).toBe('750');
    expect(r.bill.toString()).toBe('1000');
    expect(r.margin.toString()).toBe('250');
  });
});

describe('reconciliation invariant', () => {
  it('sum of pay plus sum of margin equals sum of bill', () => {
    const entries = [
      { payRate: d(600), billRate: d(800), otHours: d(2) },
      { payRate: d(500), billRate: d(650), otHours: d(0) },
      { payRate: d(450), billRate: d(500), otHours: d(3.5) },
    ].map(calcEntry);

    const sum = (xs: Decimal[]) => xs.reduce((a, b) => a.plus(b), d(0));
    const totalPay = sum(entries.map((e) => e.pay));
    const totalBill = sum(entries.map((e) => e.bill));
    const totalMargin = sum(entries.map((e) => e.margin));

    expect(totalPay.plus(totalMargin).equals(totalBill)).toBe(true);
  });
});

describe('STANDARD_HOURS', () => {
  it('is 8', () => {
    expect(STANDARD_HOURS.toString()).toBe('8');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/payroll.test.ts`
Expected: FAIL — cannot resolve `./payroll`.

- [ ] **Step 3: Implement `lib/payroll.ts`**

```typescript
import Decimal from 'decimal.js';

/** A standard working day. Overtime is paid per hour beyond this. */
export const STANDARD_HOURS = new Decimal(8);

export interface EntryRates {
  /** Rate snapshot taken when the attendance row was created. */
  payRate: Decimal;
  /** Rate snapshot taken when the attendance row was created. */
  billRate: Decimal;
  otHours: Decimal;
}

export interface EntryAmounts {
  pay: Decimal;
  bill: Decimal;
  margin: Decimal;
}

/**
 * Pay for one full day plus overtime.
 * Overtime carries no premium: an OT hour is the plain hourly equivalent
 * of the daily rate.
 */
export function calcPay(payRate: Decimal, otHours: Decimal): Decimal {
  return payRate.plus(payRate.dividedBy(STANDARD_HOURS).times(otHours));
}

/** Billing for one full day plus overtime. Mirrors calcPay. */
export function calcBill(billRate: Decimal, otHours: Decimal): Decimal {
  return billRate.plus(billRate.dividedBy(STANDARD_HOURS).times(otHours));
}

export function calcMargin(bill: Decimal, pay: Decimal): Decimal {
  return bill.minus(pay);
}

export function calcEntry(rates: EntryRates): EntryAmounts {
  const pay = calcPay(rates.payRate, rates.otHours);
  const bill = calcBill(rates.billRate, rates.otHours);
  return { pay, bill, margin: calcMargin(bill, pay) };
}

/** Sum a list of Decimals, returning 0 for an empty list. */
export function sum(values: Decimal[]): Decimal {
  return values.reduce((a, b) => a.plus(b), new Decimal(0));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/payroll.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/payroll.ts lib/payroll.test.ts
git commit -m "feat: add payroll calculation with reconciliation invariant"
```

---

### Task 4: Prisma schema and database

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`, `.env`, `.env.example`

- [ ] **Step 1: Create a free Neon Postgres database**

Sign up at https://neon.tech, create a project, and copy the connection string. It looks like:
`postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

- [ ] **Step 2: Write `.env`**

```
DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require"
APP_PASSWORD="choose-a-password"
```

Then write `.env.example` with the same keys and empty values. `.env` is already gitignored; `.env.example` must be committed.

- [ ] **Step 3: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Worker {
  id        String   @id @default(cuid())
  name      String
  phone     String?
  payRate   Decimal  @db.Decimal(12, 2)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  entries   Entry[]

  @@index([active])
}

model Company {
  id        String   @id @default(cuid())
  name      String
  billRate  Decimal  @db.Decimal(12, 2)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  entries   Entry[]

  @@index([active])
}

model Entry {
  id        String   @id @default(cuid())
  date      DateTime @db.Date
  workerId  String
  companyId String
  otHours   Decimal  @default(0) @db.Decimal(6, 2)

  // Rates in force when this row was created. Reports read these,
  // never the current rate, so history never changes retroactively.
  payRateSnapshot  Decimal @db.Decimal(12, 2)
  billRateSnapshot Decimal @db.Decimal(12, 2)

  createdAt DateTime @default(now())

  worker  Worker  @relation(fields: [workerId], references: [id])
  company Company @relation(fields: [companyId], references: [id])

  @@unique([date, workerId])
  @@index([date])
  @@index([companyId, date])
  @@index([workerId, date])
}
```

- [ ] **Step 4: Run the migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/migrations/<timestamp>_init/` and prints "Your database is now in sync with your schema."

- [ ] **Step 5: Write `lib/db.ts`**

Next.js hot-reloads in development and would otherwise open a new pool on every reload until Postgres refuses connections.

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 6: Verify the client generates and connects**

```bash
npx prisma generate
npx prisma db execute --stdin <<< "SELECT 1;"
```

Expected: both succeed without error.

- [ ] **Step 7: Commit**

```bash
git add prisma lib/db.ts .env.example
git commit -m "feat: add Prisma schema with rate snapshots"
```

---

### Task 5: Worker register

**Files:**
- Create: `app/actions/workers.ts`, `app/workers/page.tsx`, `app/workers/worker-form.tsx`

- [ ] **Step 1: Write `app/actions/workers.ts`**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export async function listWorkers(includeInactive = false) {
  return db.worker.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function createWorker(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const payRate = String(formData.get('payRate') ?? '').trim();

  if (!name) return { error: 'Name is required.' };
  if (!payRate || Number(payRate) < 0) return { error: 'Pay rate must be zero or more.' };

  await db.worker.create({ data: { name, phone, payRate } });
  revalidatePath('/workers');
  return { ok: true };
}

export async function updateWorker(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const payRate = String(formData.get('payRate') ?? '').trim();

  if (!name) return { error: 'Name is required.' };
  if (!payRate || Number(payRate) < 0) return { error: 'Pay rate must be zero or more.' };

  await db.worker.update({ where: { id }, data: { name, phone, payRate } });
  revalidatePath('/workers');
  return { ok: true };
}

/**
 * Deactivate rather than delete. Deleting would orphan attendance rows
 * and corrupt closed months.
 */
export async function setWorkerActive(id: string, active: boolean) {
  await db.worker.update({ where: { id }, data: { active } });
  revalidatePath('/workers');
  return { ok: true };
}
```

- [ ] **Step 2: Write `app/workers/page.tsx`**

```tsx
import { listWorkers, createWorker, setWorkerActive } from '@/app/actions/workers';

export default async function WorkersPage() {
  const workers = await listWorkers(true);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Workers</h1>

      <form action={createWorker} className="mb-8 flex flex-wrap gap-2">
        <input name="name" placeholder="Name" required
          className="flex-1 rounded border px-3 py-2" />
        <input name="phone" placeholder="Phone (optional)"
          className="w-40 rounded border px-3 py-2" />
        <input name="payRate" type="number" step="0.01" min="0" placeholder="Day rate" required
          className="w-32 rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Add
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead className="border-b">
          <tr>
            <th className="py-2">Name</th>
            <th>Phone</th>
            <th className="text-right">Day rate</th>
            <th className="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id} className={`border-b ${w.active ? '' : 'opacity-40'}`}>
              <td className="py-2">{w.name}</td>
              <td>{w.phone ?? '—'}</td>
              <td className="text-right">₹{w.payRate.toString()}</td>
              <td className="text-right">
                <form action={setWorkerActive.bind(null, w.id, !w.active)}>
                  <button className="text-blue-600 underline">
                    {w.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {workers.length === 0 && (
        <p className="py-8 text-center text-gray-500">No workers yet. Add one above.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify in the browser**

```bash
npm run dev
```

Visit http://localhost:3000/workers, add a worker named "Ramesh" with rate 600. Expected: appears in the table as `₹600`. Click Deactivate; expected: row dims and button reads "Reactivate".

- [ ] **Step 4: Commit**

```bash
git add app/actions/workers.ts app/workers
git commit -m "feat: add worker register"
```

---

### Task 6: Company register

Identical shape to Task 5 with `billRate` instead of `payRate`.

**Files:**
- Create: `app/actions/companies.ts`, `app/companies/page.tsx`

- [ ] **Step 1: Write `app/actions/companies.ts`**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export async function listCompanies(includeInactive = false) {
  return db.company.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function createCompany(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const billRate = String(formData.get('billRate') ?? '').trim();

  if (!name) return { error: 'Name is required.' };
  if (!billRate || Number(billRate) < 0) return { error: 'Bill rate must be zero or more.' };

  await db.company.create({ data: { name, billRate } });
  revalidatePath('/companies');
  return { ok: true };
}

export async function updateCompany(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const billRate = String(formData.get('billRate') ?? '').trim();

  if (!name) return { error: 'Name is required.' };
  if (!billRate || Number(billRate) < 0) return { error: 'Bill rate must be zero or more.' };

  await db.company.update({ where: { id }, data: { name, billRate } });
  revalidatePath('/companies');
  return { ok: true };
}

export async function setCompanyActive(id: string, active: boolean) {
  await db.company.update({ where: { id }, data: { active } });
  revalidatePath('/companies');
  return { ok: true };
}
```

- [ ] **Step 2: Write `app/companies/page.tsx`**

```tsx
import { listCompanies, createCompany, setCompanyActive } from '@/app/actions/companies';

export default async function CompaniesPage() {
  const companies = await listCompanies(true);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Companies</h1>

      <form action={createCompany} className="mb-8 flex flex-wrap gap-2">
        <input name="name" placeholder="Company name" required
          className="flex-1 rounded border px-3 py-2" />
        <input name="billRate" type="number" step="0.01" min="0" placeholder="Bill rate / day" required
          className="w-40 rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Add
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead className="border-b">
          <tr>
            <th className="py-2">Company</th>
            <th className="text-right">Bill rate</th>
            <th className="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className={`border-b ${c.active ? '' : 'opacity-40'}`}>
              <td className="py-2">{c.name}</td>
              <td className="text-right">₹{c.billRate.toString()}</td>
              <td className="text-right">
                <form action={setCompanyActive.bind(null, c.id, !c.active)}>
                  <button className="text-blue-600 underline">
                    {c.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {companies.length === 0 && (
        <p className="py-8 text-center text-gray-500">No companies yet. Add one above.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Visit http://localhost:3000/companies, add "Acme Industries" with rate 800. Expected: appears as `₹800`.

- [ ] **Step 4: Commit**

```bash
git add app/actions/companies.ts app/companies
git commit -m "feat: add company register"
```

---

### Task 7: Daily attendance entry

The high-volume screen. Shows every active worker for a chosen date with a company dropdown and an OT field. Selecting a company creates or updates that worker's row for that date; selecting the blank option deletes it (marks absent).

**Files:**
- Create: `app/actions/attendance.ts`, `app/attendance/page.tsx`, `app/attendance/attendance-row.tsx`

- [ ] **Step 1: Write `app/actions/attendance.ts`**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { fromDateKey } from '@/lib/date';

/**
 * Create or update one worker's attendance for one date.
 * Rates are snapshotted here and never re-read afterwards.
 */
export async function setAttendance(
  dateKey: string,
  workerId: string,
  companyId: string,
  otHours: string,
) {
  const date = fromDateKey(dateKey);
  const ot = otHours.trim() === '' ? '0' : otHours;

  if (Number(ot) < 0) return { error: 'Overtime cannot be negative.' };

  const [worker, company] = await Promise.all([
    db.worker.findUnique({ where: { id: workerId } }),
    db.company.findUnique({ where: { id: companyId } }),
  ]);

  if (!worker) return { error: 'Worker not found.' };
  if (!company) return { error: 'Company not found.' };

  await db.entry.upsert({
    where: { date_workerId: { date, workerId } },
    create: {
      date,
      workerId,
      companyId,
      otHours: ot,
      payRateSnapshot: worker.payRate,
      billRateSnapshot: company.billRate,
    },
    // On update the company or OT may change. Snapshots are refreshed to the
    // rates in force now, because the entry is being re-stated today.
    update: {
      companyId,
      otHours: ot,
      payRateSnapshot: worker.payRate,
      billRateSnapshot: company.billRate,
    },
  });

  revalidatePath('/attendance');
  return { ok: true };
}

/** Mark absent by removing the row. */
export async function clearAttendance(dateKey: string, workerId: string) {
  const date = fromDateKey(dateKey);
  await db.entry.deleteMany({ where: { date, workerId } });
  revalidatePath('/attendance');
  return { ok: true };
}

export async function getAttendanceForDate(dateKey: string) {
  const date = fromDateKey(dateKey);
  return db.entry.findMany({ where: { date } });
}
```

- [ ] **Step 2: Write `app/attendance/attendance-row.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { setAttendance, clearAttendance } from '@/app/actions/attendance';

interface Props {
  dateKey: string;
  workerId: string;
  workerName: string;
  companies: { id: string; name: string }[];
  currentCompanyId: string | null;
  currentOt: string;
}

export function AttendanceRow(props: Props) {
  const { dateKey, workerId, workerName, companies, currentCompanyId, currentOt } = props;
  const [pending, startTransition] = useTransition();

  function onCompanyChange(companyId: string) {
    startTransition(async () => {
      if (companyId === '') {
        await clearAttendance(dateKey, workerId);
      } else {
        await setAttendance(dateKey, workerId, companyId, currentOt);
      }
    });
  }

  function onOtBlur(value: string) {
    if (!currentCompanyId) return;
    startTransition(async () => {
      await setAttendance(dateKey, workerId, currentCompanyId, value);
    });
  }

  return (
    <tr className={`border-b ${pending ? 'opacity-50' : ''}`}>
      <td className="py-2">{workerName}</td>
      <td>
        <select
          defaultValue={currentCompanyId ?? ''}
          onChange={(e) => onCompanyChange(e.target.value)}
          className="w-full rounded border px-2 py-1"
        >
          <option value="">— Absent —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>
      <td className="w-24">
        <input
          type="number"
          step="0.5"
          min="0"
          defaultValue={currentOt}
          disabled={!currentCompanyId}
          onBlur={(e) => onOtBlur(e.target.value)}
          className="w-full rounded border px-2 py-1 disabled:bg-gray-100"
        />
      </td>
    </tr>
  );
}
```

- [ ] **Step 3: Write `app/attendance/page.tsx`**

```tsx
import { listWorkers } from '@/app/actions/workers';
import { listCompanies } from '@/app/actions/companies';
import { getAttendanceForDate } from '@/app/actions/attendance';
import { toDateKey } from '@/lib/date';
import { AttendanceRow } from './attendance-row';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const dateKey = params.date ?? toDateKey(new Date());

  const [workers, companies, entries] = await Promise.all([
    listWorkers(),
    listCompanies(),
    getAttendanceForDate(dateKey),
  ]);

  const byWorker = new Map(entries.map((e) => [e.workerId, e]));
  const present = entries.length;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Daily Attendance</h1>

      <form className="mb-6 flex items-center gap-3">
        <input type="date" name="date" defaultValue={dateKey}
          className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">Go</button>
        <span className="text-sm text-gray-600">
          {present} of {workers.length} present
        </span>
      </form>

      <table className="w-full text-left text-sm">
        <thead className="border-b">
          <tr>
            <th className="py-2">Worker</th>
            <th>Company</th>
            <th>OT hrs</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => {
            const e = byWorker.get(w.id);
            return (
              <AttendanceRow
                key={w.id}
                dateKey={dateKey}
                workerId={w.id}
                workerName={w.name}
                companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                currentCompanyId={e?.companyId ?? null}
                currentOt={e?.otHours.toString() ?? '0'}
              />
            );
          })}
        </tbody>
      </table>

      {workers.length === 0 && (
        <p className="py-8 text-center text-gray-500">
          Add workers first on the Workers page.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Visit http://localhost:3000/attendance. Assign Ramesh to Acme Industries, set OT to 2. Reload the page. Expected: selection and OT persist, header shows "1 of 1 present". Set the dropdown back to "— Absent —" and reload. Expected: OT field disables and the count returns to 0.

- [ ] **Step 5: Commit**

```bash
git add app/actions/attendance.ts app/attendance
git commit -m "feat: add daily attendance entry"
```

---

### Task 8: Report queries

**Files:**
- Create: `lib/reports.ts`
- Test: `lib/reports.test.ts`

- [ ] **Step 1: Write the failing test**

This tests the pure aggregation shape, not the database. Rows are passed in.

```typescript
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { aggregate, type ReportRow } from './reports';

const d = (v: string | number) => new Decimal(v);

const rows: ReportRow[] = [
  { dateKey: '2026-09-01', workerId: 'w1', workerName: 'Ramesh',
    companyId: 'c1', companyName: 'Acme',
    payRate: d(600), billRate: d(800), otHours: d(2) },
  { dateKey: '2026-09-02', workerId: 'w1', workerName: 'Ramesh',
    companyId: 'c2', companyName: 'Globex',
    payRate: d(600), billRate: d(700), otHours: d(0) },
  { dateKey: '2026-09-01', workerId: 'w2', workerName: 'Suresh',
    companyId: 'c1', companyName: 'Acme',
    payRate: d(500), billRate: d(800), otHours: d(0) },
];

describe('aggregate', () => {
  it('totals pay per worker', () => {
    const r = aggregate(rows);
    expect(r.byWorker.get('w1')!.pay.toString()).toBe('1350'); // 750 + 600
    expect(r.byWorker.get('w2')!.pay.toString()).toBe('500');
  });

  it('totals billing per company', () => {
    const r = aggregate(rows);
    expect(r.byCompany.get('c1')!.bill.toString()).toBe('1800'); // 1000 + 800
    expect(r.byCompany.get('c2')!.bill.toString()).toBe('700');
  });

  it('counts days worked per worker', () => {
    const r = aggregate(rows);
    expect(r.byWorker.get('w1')!.days).toBe(2);
  });

  it('reconciles: total pay + total margin = total bill', () => {
    const r = aggregate(rows);
    expect(r.totals.pay.plus(r.totals.margin).equals(r.totals.bill)).toBe(true);
  });

  it('returns zero totals for no rows', () => {
    const r = aggregate([]);
    expect(r.totals.pay.toString()).toBe('0');
    expect(r.totals.bill.toString()).toBe('0');
    expect(r.byWorker.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/reports.test.ts`
Expected: FAIL — cannot resolve `./reports`.

- [ ] **Step 3: Implement `lib/reports.ts`**

```typescript
import Decimal from 'decimal.js';
import { db } from './db';
import { calcEntry, sum } from './payroll';
import { monthRange, toDateKey } from './date';

export interface ReportRow {
  dateKey: string;
  workerId: string;
  workerName: string;
  companyId: string;
  companyName: string;
  payRate: Decimal;
  billRate: Decimal;
  otHours: Decimal;
}

export interface Bucket {
  id: string;
  name: string;
  days: number;
  otHours: Decimal;
  pay: Decimal;
  bill: Decimal;
  margin: Decimal;
}

export interface Aggregated {
  byWorker: Map<string, Bucket>;
  byCompany: Map<string, Bucket>;
  totals: { pay: Decimal; bill: Decimal; margin: Decimal; days: number };
}

function emptyBucket(id: string, name: string): Bucket {
  return {
    id, name, days: 0,
    otHours: new Decimal(0),
    pay: new Decimal(0),
    bill: new Decimal(0),
    margin: new Decimal(0),
  };
}

function add(b: Bucket, otHours: Decimal, pay: Decimal, bill: Decimal, margin: Decimal) {
  b.days += 1;
  b.otHours = b.otHours.plus(otHours);
  b.pay = b.pay.plus(pay);
  b.bill = b.bill.plus(bill);
  b.margin = b.margin.plus(margin);
}

/** Pure aggregation. Takes rows, returns per-worker and per-company totals. */
export function aggregate(rows: ReportRow[]): Aggregated {
  const byWorker = new Map<string, Bucket>();
  const byCompany = new Map<string, Bucket>();

  for (const r of rows) {
    const { pay, bill, margin } = calcEntry({
      payRate: r.payRate,
      billRate: r.billRate,
      otHours: r.otHours,
    });

    if (!byWorker.has(r.workerId)) byWorker.set(r.workerId, emptyBucket(r.workerId, r.workerName));
    if (!byCompany.has(r.companyId)) byCompany.set(r.companyId, emptyBucket(r.companyId, r.companyName));

    add(byWorker.get(r.workerId)!, r.otHours, pay, bill, margin);
    add(byCompany.get(r.companyId)!, r.otHours, pay, bill, margin);
  }

  const all = [...byWorker.values()];
  return {
    byWorker,
    byCompany,
    totals: {
      pay: sum(all.map((b) => b.pay)),
      bill: sum(all.map((b) => b.bill)),
      margin: sum(all.map((b) => b.margin)),
      days: all.reduce((a, b) => a + b.days, 0),
    },
  };
}

/** Load every attendance row for a month as ReportRows. */
export async function loadMonth(year: number, month: number): Promise<ReportRow[]> {
  const { start, end } = monthRange(year, month);

  const entries = await db.entry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { worker: true, company: true },
    orderBy: [{ date: 'asc' }],
  });

  return entries.map((e) => ({
    dateKey: toDateKey(e.date),
    workerId: e.workerId,
    workerName: e.worker.name,
    companyId: e.companyId,
    companyName: e.company.name,
    payRate: new Decimal(e.payRateSnapshot.toString()),
    billRate: new Decimal(e.billRateSnapshot.toString()),
    otHours: new Decimal(e.otHours.toString()),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/reports.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, 24 tests across 3 files.

- [ ] **Step 6: Commit**

```bash
git add lib/reports.ts lib/reports.test.ts
git commit -m "feat: add report aggregation"
```

---

### Task 9: Report screens

**Files:**
- Create: `lib/format.ts`, `app/reports/worker/page.tsx`, `app/reports/company/page.tsx`, `app/reports/summary/page.tsx`

- [ ] **Step 1: Write `lib/format.ts`**

```typescript
import Decimal from 'decimal.js';

/** Format as Indian rupees with two decimals. */
export function money(v: Decimal): string {
  return '₹' + v.toFixed(2);
}

export function hours(v: Decimal): string {
  return v.isZero() ? '—' : v.toString();
}

/** Current year and month, 1-12. */
export function currentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}
```

- [ ] **Step 2: Write `app/reports/worker/page.tsx`**

```tsx
import { loadMonth, aggregate } from '@/lib/reports';
import { calcEntry } from '@/lib/payroll';
import { money, hours, currentMonth } from '@/lib/format';

export default async function WorkerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; workerId?: string }>;
}) {
  const p = await searchParams;
  const def = currentMonth();
  const year = Number(p.year ?? def.year);
  const month = Number(p.month ?? def.month);

  const rows = await loadMonth(year, month);
  const agg = aggregate(rows);
  const workerId = p.workerId ?? [...agg.byWorker.keys()][0];
  const detail = rows.filter((r) => r.workerId === workerId);
  const bucket = workerId ? agg.byWorker.get(workerId) : undefined;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Worker Report</h1>

      <form className="mb-6 flex flex-wrap gap-2">
        <select name="workerId" defaultValue={workerId} className="rounded border px-3 py-2">
          {[...agg.byWorker.values()].map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input type="number" name="year" defaultValue={year} className="w-24 rounded border px-3 py-2" />
        <input type="number" name="month" min="1" max="12" defaultValue={month}
          className="w-20 rounded border px-3 py-2" />
        <button className="rounded bg-black px-4 py-2 text-white">View</button>
      </form>

      {!bucket ? (
        <p className="py-8 text-center text-gray-500">No attendance recorded for this month.</p>
      ) : (
        <>
          <table className="w-full text-left text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2">Date</th>
                <th>Company</th>
                <th className="text-right">OT hrs</th>
                <th className="text-right">Pay</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r) => {
                const { pay } = calcEntry({
                  payRate: r.payRate, billRate: r.billRate, otHours: r.otHours,
                });
                return (
                  <tr key={r.dateKey} className="border-b">
                    <td className="py-2">{r.dateKey}</td>
                    <td>{r.companyName}</td>
                    <td className="text-right">{hours(r.otHours)}</td>
                    <td className="text-right">{money(pay)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-3">{bucket.days} days</td>
                <td />
                <td className="text-right">{hours(bucket.otHours)}</td>
                <td className="text-right">{money(bucket.pay)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Write `app/reports/company/page.tsx`**

```tsx
import { loadMonth, aggregate } from '@/lib/reports';
import { calcEntry } from '@/lib/payroll';
import { money, hours, currentMonth } from '@/lib/format';

export default async function CompanyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; companyId?: string }>;
}) {
  const p = await searchParams;
  const def = currentMonth();
  const year = Number(p.year ?? def.year);
  const month = Number(p.month ?? def.month);

  const rows = await loadMonth(year, month);
  const agg = aggregate(rows);
  const companyId = p.companyId ?? [...agg.byCompany.keys()][0];
  const detail = rows.filter((r) => r.companyId === companyId);
  const bucket = companyId ? agg.byCompany.get(companyId) : undefined;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Company Report</h1>

      <form className="mb-6 flex flex-wrap gap-2">
        <select name="companyId" defaultValue={companyId} className="rounded border px-3 py-2">
          {[...agg.byCompany.values()].map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input type="number" name="year" defaultValue={year} className="w-24 rounded border px-3 py-2" />
        <input type="number" name="month" min="1" max="12" defaultValue={month}
          className="w-20 rounded border px-3 py-2" />
        <button className="rounded bg-black px-4 py-2 text-white">View</button>
      </form>

      {!bucket ? (
        <p className="py-8 text-center text-gray-500">No attendance recorded for this month.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="py-2">Date</th>
              <th>Worker</th>
              <th className="text-right">OT hrs</th>
              <th className="text-right">Billed</th>
            </tr>
          </thead>
          <tbody>
            {detail.map((r) => {
              const { bill } = calcEntry({
                payRate: r.payRate, billRate: r.billRate, otHours: r.otHours,
              });
              return (
                <tr key={`${r.dateKey}-${r.workerId}`} className="border-b">
                  <td className="py-2">{r.dateKey}</td>
                  <td>{r.workerName}</td>
                  <td className="text-right">{hours(r.otHours)}</td>
                  <td className="text-right">{money(bill)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-3">{bucket.days} man-days</td>
              <td />
              <td className="text-right">{hours(bucket.otHours)}</td>
              <td className="text-right">{money(bucket.bill)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Write `app/reports/summary/page.tsx`**

```tsx
import { loadMonth, aggregate } from '@/lib/reports';
import { money, currentMonth } from '@/lib/format';

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const p = await searchParams;
  const def = currentMonth();
  const year = Number(p.year ?? def.year);
  const month = Number(p.month ?? def.month);

  const agg = aggregate(await loadMonth(year, month));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Monthly Summary</h1>

      <form className="mb-6 flex gap-2">
        <input type="number" name="year" defaultValue={year} className="w-24 rounded border px-3 py-2" />
        <input type="number" name="month" min="1" max="12" defaultValue={month}
          className="w-20 rounded border px-3 py-2" />
        <button className="rounded bg-black px-4 py-2 text-white">View</button>
      </form>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">To pay workers</div>
          <div className="text-xl font-semibold">{money(agg.totals.pay)}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">To collect from companies</div>
          <div className="text-xl font-semibold">{money(agg.totals.bill)}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Margin</div>
          <div className="text-xl font-semibold">{money(agg.totals.margin)}</div>
        </div>
      </div>

      <h2 className="mb-2 font-semibold">Workers — to pay</h2>
      <table className="mb-8 w-full text-left text-sm">
        <thead className="border-b">
          <tr><th className="py-2">Worker</th><th className="text-right">Days</th><th className="text-right">Pay</th></tr>
        </thead>
        <tbody>
          {[...agg.byWorker.values()].map((b) => (
            <tr key={b.id} className="border-b">
              <td className="py-2">{b.name}</td>
              <td className="text-right">{b.days}</td>
              <td className="text-right">{money(b.pay)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">Companies — to collect</h2>
      <table className="w-full text-left text-sm">
        <thead className="border-b">
          <tr><th className="py-2">Company</th><th className="text-right">Man-days</th><th className="text-right">Billed</th></tr>
        </thead>
        <tbody>
          {[...agg.byCompany.values()].map((b) => (
            <tr key={b.id} className="border-b">
              <td className="py-2">{b.name}</td>
              <td className="text-right">{b.days}</td>
              <td className="text-right">{money(b.bill)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {agg.totals.days === 0 && (
        <p className="py-8 text-center text-gray-500">No attendance recorded for this month.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Visit http://localhost:3000/reports/summary. Expected: with one worker at 600 assigned one day with 2h OT to a company billing 800, the tiles read pay `₹750.00`, collect `₹1000.00`, margin `₹250.00`.

- [ ] **Step 6: Commit**

```bash
git add lib/format.ts app/reports
git commit -m "feat: add worker, company and summary reports"
```

---

### Task 10: Navigation and password gate

**Files:**
- Create: `middleware.ts`, `app/login/page.tsx`, `app/actions/auth.ts`
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Write `app/actions/auth.ts`**

```typescript
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'wm_session';

export async function login(formData: FormData) {
  const password = String(formData.get('password') ?? '');

  if (password !== process.env.APP_PASSWORD) {
    return { error: 'Wrong password.' };
  }

  const jar = await cookies();
  jar.set(COOKIE, 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect('/attendance');
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect('/login');
}
```

- [ ] **Step 2: Write `middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('wm_session')?.value === 'ok';
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/attendance', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 3: Write `app/login/page.tsx`**

```tsx
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm p-6 pt-24">
      <h1 className="mb-6 text-2xl font-semibold">Worker Management</h1>
      <form action={login} className="flex gap-2">
        <input name="password" type="password" placeholder="Password" required
          className="flex-1 rounded border px-3 py-2" />
        <button className="rounded bg-black px-4 py-2 text-white">Enter</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Replace `app/layout.tsx` with a version that has navigation**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Worker Management',
};

const links = [
  ['/attendance', 'Attendance'],
  ['/workers', 'Workers'],
  ['/companies', 'Companies'],
  ['/reports/worker', 'Worker Report'],
  ['/reports/company', 'Company Report'],
  ['/reports/summary', 'Summary'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b bg-gray-50">
          <div className="mx-auto flex max-w-4xl flex-wrap gap-4 p-4 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="hover:underline">{label}</Link>
            ))}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Replace `app/page.tsx` to redirect to attendance**

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/attendance');
}
```

- [ ] **Step 6: Verify in the browser**

Visit http://localhost:3000. Expected: redirected to `/login`. Enter the wrong password; expected: stays on login. Enter the `APP_PASSWORD` value; expected: lands on `/attendance` with the nav bar visible.

- [ ] **Step 7: Commit**

```bash
git add middleware.ts app/login app/actions/auth.ts app/layout.tsx app/page.tsx
git commit -m "feat: add password gate and navigation"
```

---

### Task 11: Deploy to Vercel

**Files:**
- Create: `README.md`

- [ ] **Step 1: Ensure the production build succeeds locally**

```bash
npm run build
```

Expected: "Compiled successfully". Fix any type errors before continuing.

- [ ] **Step 2: Add the Prisma generate step to the build**

Vercel caches `node_modules`, so `@prisma/client` must be regenerated on each deploy. In `package.json`, change the build script:

```json
"build": "prisma generate && next build"
```

- [ ] **Step 3: Write `README.md`**

````markdown
# Worker Management

Tracks which worker went to which company each day, and produces month-end
worker payroll and company billing with overtime.

## Setup

```bash
npm install
cp .env.example .env    # fill in DATABASE_URL and APP_PASSWORD
npx prisma migrate dev
npm run dev
```

## How it works

- Each worker has a daily pay rate; each company has a daily bill rate.
- One attendance row = one full day worked. Absence = no row.
- Overtime is paid at the plain hourly equivalent: `rate ÷ 8` per OT hour.
- Every entry snapshots the rates used, so past reports never change when
  a rate is updated.

## Tests

```bash
npm test
```
````

- [ ] **Step 4: Push and deploy**

```bash
git add README.md package.json
git commit -m "chore: add README and Prisma build step"
git push
```

Then at https://vercel.com, import the `mrpal5a/worker-management` repository and set
environment variables `DATABASE_URL` and `APP_PASSWORD` to the same values as `.env`.

- [ ] **Step 5: Verify the deployment**

Open the Vercel URL. Expected: login page appears, password works, and a worker
added in production persists across a reload.

---

## Self-Review

**Spec coverage:** Rate model → Task 4 schema. Calculation → Task 3. Rate
snapshots → Tasks 4 and 7. Decimal money → Task 3, Task 4. One-worker-per-day
→ Task 4 unique constraint. Soft delete → Tasks 5 and 6. Six screens → Tasks 5,
6, 7, 9. Auth → Task 10. Unit tests → Tasks 2, 3, 8. Reconciliation invariant →
Tasks 3 and 8. All covered.

**Type consistency:** `calcEntry` takes `EntryRates { payRate, billRate, otHours }`
and returns `EntryAmounts { pay, bill, margin }` in Task 3; used with those exact
names in Tasks 8 and 9. `ReportRow` defined in Task 8 and consumed in Task 9.
`toDateKey` / `fromDateKey` defined in Task 2 and used in Tasks 7 and 8.

**Known deviation from strict TDD:** Tasks 5, 6, 7, 9, 10 are UI and database
glue, verified in the browser rather than by unit tests. The logic that must be
correct — all money math and aggregation — is covered by tests in Tasks 2, 3 and
8. Adding end-to-end browser tests would be a reasonable follow-up but is out of
scope for this version.
