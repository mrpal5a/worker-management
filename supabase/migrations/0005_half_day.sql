-- Half-day attendance.
--
-- Apply in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- day_fraction is the share of the day rate a worker earns for the day:
-- 1 for a full day, 0.5 for a half day. Every existing row defaults to 1,
-- so history is untouched. Overtime is still paid per hour on top.
alter table public.entries
  add column if not exists day_fraction numeric(3,2) not null default 1
    check (day_fraction in (0.5, 1));
