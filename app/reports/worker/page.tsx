import { loadMonth } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { calcEntry } from '@/lib/payroll';
import { money, hours, currentMonth, monthLabel } from '@/lib/format';
import { MonthPicker } from '../month-picker';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { Select } from '@/components/ui/select';
import { TableWrap, Th, Td, Tr } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { FileTextIcon } from '@/components/ui/icons';

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
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Worker Report"
        eyebrow={monthLabel(year, month)}
        icon={<FileTextIcon />}
        action={bucket ? <HeroStat value={money(bucket.pay)} label="pay" /> : undefined}
      />

      <MonthPicker year={year} month={month}>
        <Select name="workerId" defaultValue={workerId} className="sm:w-auto">
          {[...agg.byWorker.values()].map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </MonthPicker>

      {!bucket ? (
        <EmptyState title="No attendance recorded" description={`Nothing logged for ${monthLabel(year, month)}.`} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Company</Th>
              <Th right>OT hrs</Th>
              <Th right>Pay</Th>
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
                <Tr key={r.dateKey}>
                  <Td>{r.dateKey}</Td>
                  <Td>{r.companyName}</Td>
                  <Td right>{hours(r.otHours)}</Td>
                  <Td right>{money(pay)}</Td>
                </Tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <Td>{bucket.days} days</Td>
              <Td />
              <Td right>{hours(bucket.otHours)}</Td>
              <Td right>{money(bucket.pay)}</Td>
            </tr>
          </tfoot>
        </TableWrap>
      )}
    </main>
  );
}
