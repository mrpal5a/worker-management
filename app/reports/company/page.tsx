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
import { BarChartIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function CompanyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; companyId?: string }>;
}) {
  const p = await searchParams;
  const fallback = currentMonth();
  const year = Number(p.year) || fallback.year;
  const month = Number(p.month) || fallback.month;

  const rows = await loadMonth(year, month);
  const agg = aggregate(rows);

  const companyIds = [...agg.byCompany.keys()];
  const companyId = p.companyId && agg.byCompany.has(p.companyId) ? p.companyId : companyIds[0];
  const bucket = companyId ? agg.byCompany.get(companyId) : undefined;
  const detail = rows.filter((r) => r.companyId === companyId);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Company Report"
        eyebrow={monthLabel(year, month)}
        icon={<BarChartIcon />}
        action={bucket ? <HeroStat value={money(bucket.bill)} label="billed" /> : undefined}
      />

      <MonthPicker year={year} month={month}>
        <Select name="companyId" defaultValue={companyId} className="sm:w-auto">
          {[...agg.byCompany.values()].map((b) => (
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
              <Th>Worker</Th>
              <Th right>OT hrs</Th>
              <Th right>Billed</Th>
            </tr>
          </thead>
          <tbody>
            {detail.map((r) => {
              const { bill } = calcEntry({
                payRate: r.payRate,
                billRate: r.billRate,
                otHours: r.otHours,
              });
              return (
                <Tr key={`${r.dateKey}-${r.workerId}`}>
                  <Td>{r.dateKey}</Td>
                  <Td>{r.workerName}</Td>
                  <Td right>{hours(r.otHours)}</Td>
                  <Td right>{money(bill)}</Td>
                </Tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <Td>{bucket.days} man-days</Td>
              <Td />
              <Td right>{hours(bucket.otHours)}</Td>
              <Td right>{money(bucket.bill)}</Td>
            </tr>
          </tfoot>
        </TableWrap>
      )}
    </main>
  );
}
