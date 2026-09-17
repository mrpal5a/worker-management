-- Worker Management — initial schema
-- Apply in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ---------------------------------------------------------------------------
-- Workers
-- ---------------------------------------------------------------------------
create table if not exists public.workers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  phone      text,
  pay_rate   numeric(12,2) not null check (pay_rate >= 0),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists workers_active_idx on public.workers (active);

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  bill_rate  numeric(12,2) not null check (bill_rate >= 0),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists companies_active_idx on public.companies (active);

-- ---------------------------------------------------------------------------
-- Attendance entries
--
-- One row = one worker worked one full day at one company.
-- Absence is represented by the ABSENCE of a row, not by a flag.
--
-- pay_rate_snapshot / bill_rate_snapshot record the rates in force when the
-- row was created. All reporting reads these, never the current rate on
-- workers/companies, so raising a rate mid-month cannot retroactively rewrite
-- days already recorded.
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id                 uuid primary key default gen_random_uuid(),
  date               date not null,
  worker_id          uuid not null references public.workers (id) on delete restrict,
  company_id         uuid not null references public.companies (id) on delete restrict,
  ot_hours           numeric(6,2) not null default 0 check (ot_hours >= 0),
  pay_rate_snapshot  numeric(12,2) not null check (pay_rate_snapshot >= 0),
  bill_rate_snapshot numeric(12,2) not null check (bill_rate_snapshot >= 0),
  created_at         timestamptz not null default now(),

  -- A worker is at exactly one company per day.
  constraint entries_one_company_per_day unique (date, worker_id)
);

create index if not exists entries_date_idx         on public.entries (date);
create index if not exists entries_company_date_idx on public.entries (company_id, date);
create index if not exists entries_worker_date_idx  on public.entries (worker_id, date);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Every table is exposed through Supabase's auto-generated REST API. Without
-- RLS, anyone holding the public anon key could read and write payroll data.
--
-- RLS is enabled with NO policies, which denies all access to the anon and
-- authenticated roles. The app connects server-side with the service_role key,
-- which bypasses RLS by design — so the app keeps working while the public API
-- surface stays closed.
--
-- Do not add permissive policies unless you intend browser-side access.
-- ---------------------------------------------------------------------------
alter table public.workers   enable row level security;
alter table public.companies enable row level security;
alter table public.entries   enable row level security;

-- Revoke the default grants PostgREST relies on for the public roles.
revoke all on public.workers   from anon, authenticated;
revoke all on public.companies from anon, authenticated;
revoke all on public.entries   from anon, authenticated;
