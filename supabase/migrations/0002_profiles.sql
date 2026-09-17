-- Worker Management — accounts
-- Apply in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Supabase owns auth.users (email, password hash, timestamps). This adds the
-- application's own view of an account: display name, role, and whether the
-- account is still allowed in.

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  role       text not null default 'user' check (role in ('admin', 'user')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- As with the other tables: RLS on, no policies, so the anon and authenticated
-- roles are denied everything through the public REST API. The app reads this
-- table server-side with the service_role key, which bypasses RLS.
--
-- This matters more here than elsewhere — a writable profiles table exposed to
-- the anon key would let anyone set their own role to 'admin'.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
