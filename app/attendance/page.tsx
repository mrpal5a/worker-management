import Link from 'next/link';
import { listWorkers, listCompanies, entriesForDate } from '@/lib/repo';
import { toDateKey } from '@/lib/date';
import { AttendanceRow } from './attendance-row';

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

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-semibold">Daily Attendance</h1>

      <form className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="date"
          name="date"
          defaultValue={dateKey}
          className="min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8"
        />
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover sm:min-h-9">
          Go
        </button>
        <span className="text-sm text-text-muted">
          {entries.length} of {workers.length} present
        </span>
      </form>

      {workers.length === 0 ? (
        <p className="py-8 text-center text-text-muted">
          No active workers. Add them on the{' '}
          <Link href="/workers" className="text-accent hover:underline">
            Workers
          </Link>{' '}
          page first.
        </p>
      ) : companies.length === 0 ? (
        <p className="py-8 text-center text-text-muted">
          No active companies. Add them on the{' '}
          <Link href="/companies" className="text-accent hover:underline">
            Companies
          </Link>{' '}
          page first.
        </p>
      ) : (
        <>
          {/* Column headings only make sense once the row is a grid. */}
          <div className="hidden border-b pb-2 text-sm font-medium text-text-muted sm:grid sm:grid-cols-[1fr_2fr_6rem] sm:gap-3">
            <div>Worker</div>
            <div>Company</div>
            <div>OT hrs</div>
          </div>
          <ul>
            {workers.map((w) => {
              const e = byWorker.get(w.id);
              return (
                <AttendanceRow
                  key={w.id}
                  dateKey={dateKey}
                  workerId={w.id}
                  workerName={w.name}
                  companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                  initialCompanyId={e?.company_id ?? null}
                  initialOt={e ? String(e.ot_hours) : '0'}
                />
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
