-- Worker advances — interest-free loans repaid through monthly deductions.
--
-- Apply in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- Advances
--
-- One row = one advance a worker took. A worker can have more than one over
-- time (a second advance after the first is settled), so this is not a
-- single balance column on workers — it is its own ledger, the same reason
-- entries is its own table rather than a column on workers/companies.
-- ---------------------------------------------------------------------------
create table if not exists public.advances (
  id                uuid primary key default gen_random_uuid(),
  worker_id         uuid not null references public.workers (id) on delete restrict,
  principal         numeric(12,2) not null check (principal > 0),
  monthly_deduction numeric(12,2) not null check (monthly_deduction > 0),
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists advances_worker_idx on public.advances (worker_id);

-- ---------------------------------------------------------------------------
-- Advance payments
--
-- One row = one repayment recorded against an advance, including the
-- "already paid" opening amount entered when the advance is first tracked.
-- The outstanding balance is always principal minus the sum of these rows —
-- never stored, so it can never drift out of sync with the ledger.
-- ---------------------------------------------------------------------------
create table if not exists public.advance_payments (
  id          uuid primary key default gen_random_uuid(),
  advance_id  uuid not null references public.advances (id) on delete cascade,
  paid_on     date not null,
  amount      numeric(12,2) not null check (amount > 0),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists advance_payments_advance_idx on public.advance_payments (advance_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — same posture as every other table (see 0001_init.sql):
-- RLS on with no policies denies anon/authenticated; the app's service_role
-- key bypasses it.
-- ---------------------------------------------------------------------------
alter table public.advances         enable row level security;
alter table public.advance_payments enable row level security;

revoke all on public.advances         from anon, authenticated;
revoke all on public.advance_payments from anon, authenticated;
