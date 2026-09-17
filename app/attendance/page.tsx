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
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-semibold">Daily Attendance</h1>

      <form className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="date"
          name="date"
          defaultValue={dateKey}
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Go
        </button>
        <span className="text-sm text-gray-600">
          {entries.length} of {workers.length} present
        </span>
      </form>

      {workers.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No active workers. Add them on the{' '}
          <Link href="/workers" className="text-blue-600 underline">
            Workers
          </Link>{' '}
          page first.
        </p>
      ) : companies.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No active companies. Add them on the{' '}
          <Link href="/companies" className="text-blue-600 underline">
            Companies
          </Link>{' '}
          page first.
        </p>
      ) : (
        <>
          {/* Column headings only make sense once the row is a grid. */}
          <div className="hidden border-b pb-2 text-sm font-medium text-gray-500 sm:grid sm:grid-cols-[1fr_2fr_6rem] sm:gap-3">
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
