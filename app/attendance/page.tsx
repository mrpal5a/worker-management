import Link from 'next/link';
import { listWorkers, listCompanies, entriesForDate } from '@/lib/repo';
import { toDateKey } from '@/lib/date';
import { AttendanceList } from './attendance-list';
import { DateForm } from './date-form';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

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
    entriesForDate(dateKey),
  ]);

  const byWorker = new Map(entries.map((e) => [e.worker_id, e]));
  const pct = workers.length === 0 ? 0 : Math.round((entries.length / workers.length) * 100);
  const dateLabel = new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Daily Attendance"
        icon={<CalendarIcon />}
        eyebrow={dateLabel}
        action={<HeroStat value={`${entries.length}/${workers.length}`} label="present" />}
      />

      <DateForm dateKey={dateKey} />

      {workers.length > 0 && (
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {workers.length === 0 ? (
        <EmptyState
          title="No active workers"
          description={
            <>
              Add one on the{' '}
              <Link href="/add/workers" className="text-accent hover:underline">
                Workers
              </Link>{' '}
              page first.
            </>
          }
        />
      ) : companies.length === 0 ? (
        <EmptyState
          title="No active companies"
          description={
            <>
              Add one on the{' '}
              <Link href="/add/companies" className="text-accent hover:underline">
                Companies
              </Link>{' '}
              page first.
            </>
          }
        />
      ) : (
        <AttendanceList
          dateKey={dateKey}
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          workers={workers.map((w) => {
            const e = byWorker.get(w.id);
            return {
              id: w.id,
              name: w.name,
              phone: w.phone,
              companyId: e?.company_id ?? null,
              ot: e ? String(e.ot_hours) : '0',
              dayFraction: e && Number(e.day_fraction) === 0.5 ? '0.5' : '1',
              payRate: String(e ? e.pay_rate_snapshot : w.pay_rate),
            };
          })}
        />
      )}
    </main>
  );
}
