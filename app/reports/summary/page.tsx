import { loadMonth } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { money, currentMonth, monthLabel } from '@/lib/format';
import { MonthPicker } from '../month-picker';

export const dynamic = 'force-dynamic';

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const p = await searchParams;
  const fallback = currentMonth();
  const year = Number(p.year) || fallback.year;
  const month = Number(p.month) || fallback.month;

  const agg = aggregate(await loadMonth(year, month));

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="mb-1 text-2xl font-semibold">Monthly Summary</h1>
      <p className="mb-6 text-sm text-text-muted">{monthLabel(year, month)}</p>

      <MonthPicker year={year} month={month} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border-base bg-surface-raised p-4">
          <div className="text-sm text-text-muted">To pay workers</div>
          <div className="text-xl font-semibold">{money(agg.totals.pay)}</div>
        </div>
        <div className="rounded-lg border border-border-base bg-surface-raised p-4">
          <div className="text-sm text-text-muted">To collect from companies</div>
          <div className="text-xl font-semibold">{money(agg.totals.bill)}</div>
        </div>
        <div className="rounded-lg border border-border-base bg-surface-raised p-4">
          <div className="text-sm text-text-muted">Margin</div>
          <div className="text-xl font-semibold">{money(agg.totals.margin)}</div>
        </div>
      </div>

      {agg.totals.days === 0 ? (
        <p className="py-8 text-center text-text-muted">
          No attendance recorded for {monthLabel(year, month)}.
        </p>
      ) : (
        <>
          <h2 className="mb-2 font-semibold">Workers — to pay</h2>
          <div className="mb-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="tabular w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-border-base">
              <tr>
                <th className="py-2">Worker</th>
                <th className="text-right">Days</th>
                <th className="text-right">Pay</th>
              </tr>
            </thead>
            <tbody>
              {[...agg.byWorker.values()].map((b) => (
                <tr key={b.id} className="border-b border-border-base">
                  <td className="py-2">{b.name}</td>
                  <td className="text-right">{b.days}</td>
                  <td className="text-right">{money(b.pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          <h2 className="mb-2 font-semibold">Companies — to collect</h2>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="tabular w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-border-base">
              <tr>
                <th className="py-2">Company</th>
                <th className="text-right">Man-days</th>
                <th className="text-right">Billed</th>
              </tr>
            </thead>
            <tbody>
              {[...agg.byCompany.values()].map((b) => (
                <tr key={b.id} className="border-b border-border-base">
                  <td className="py-2">{b.name}</td>
                  <td className="text-right">{b.days}</td>
                  <td className="text-right">{money(b.bill)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </main>
  );
}
