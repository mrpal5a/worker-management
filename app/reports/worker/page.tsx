import { loadMonth } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { calcEntry } from '@/lib/payroll';
import { money, hours, currentMonth, monthLabel } from '@/lib/format';
import { MonthPicker } from '../month-picker';

export const dynamic = 'force-dynamic';

export default async function WorkerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; workerId?: string }>;
}) {
  const p = await searchParams;
  const fallback = currentMonth();
  const year = Number(p.year) || fallback.year;
  const month = Number(p.month) || fallback.month;

  const rows = await loadMonth(year, month);
  const agg = aggregate(rows);

  const workerIds = [...agg.byWorker.keys()];
  const workerId = p.workerId && agg.byWorker.has(p.workerId) ? p.workerId : workerIds[0];
  const bucket = workerId ? agg.byWorker.get(workerId) : undefined;
  const detail = rows.filter((r) => r.workerId === workerId);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Worker Report</h1>
      <p className="mb-6 text-sm text-gray-500">{monthLabel(year, month)}</p>

      <MonthPicker year={year} month={month}>
        <select name="workerId" defaultValue={workerId} className="rounded border px-3 py-2">
          {[...agg.byWorker.values()].map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </MonthPicker>

      {!bucket ? (
        <p className="py-8 text-center text-gray-500">
          No attendance recorded for {monthLabel(year, month)}.
        </p>
      ) : (
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
                payRate: r.payRate,
                billRate: r.billRate,
                otHours: r.otHours,
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
      )}
    </main>
  );
}
