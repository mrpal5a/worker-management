-- Remove the per-company bill rate.
--
-- A company has no rate of its own: what it owes for a man-day is exactly
-- what the worker who came was paid that day (day rate + OT). There is no
-- separate bill rate and therefore no margin to store or compute.
--
-- Apply in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.companies drop column if exists bill_rate;
alter table public.entries   drop column if exists bill_rate_snapshot;
