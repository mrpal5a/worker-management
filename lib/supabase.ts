import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client.
 *
 * This uses the SERVICE ROLE key, which bypasses Row Level Security. It must
 * never reach the browser, so the env vars deliberately lack the NEXT_PUBLIC_
 * prefix and this module imports 'server-only' — importing it from a client
 * component is a build error rather than a silent key leak.
 *
 * The client is created lazily on first use rather than at module evaluation.
 * Next.js evaluates page modules during `next build`, so an eager throw here
 * would make the build fail on any machine without credentials (CI, a fresh
 * clone). Deferring means the build succeeds and a missing key surfaces as a
 * clear runtime error on the first request instead.
 */

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Copy .env.example to .env and fill them in, then restart the dev server.',
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * PostgREST serializes `numeric` columns as unquoted JSON numbers, so they
 * arrive as JS numbers. Every one of them must be converted to Decimal before
 * any arithmetic — see toDecimal in lib/num.ts.
 */
export type Numeric = number | string;

/** Shape of a row in public.workers. */
export interface WorkerRow {
  id: string;
  name: string;
  phone: string | null;
  pay_rate: Numeric;
  active: boolean;
  created_at: string;
}

/**
 * Shape of a row in public.companies.
 *
 * No rate: a company has no billing rate of its own. What it owes for a
 * man-day is exactly what the worker who came was paid that day.
 */
export interface CompanyRow {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

/** Shape of a row in public.entries. */
export interface EntryRow {
  id: string;
  /** 'YYYY-MM-DD' — Postgres DATE has no time component. */
  date: string;
  worker_id: string;
  company_id: string;
  ot_hours: Numeric;
  pay_rate_snapshot: Numeric;
  created_at: string;
}
