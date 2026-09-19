import { loadMonth, loadDay } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { money, hours, currentMonth, monthLabel } from '@/lib/format';
import { toDateKey } from '@/lib/date';
import { MonthPicker } from '../month-picker';
import { DayPicker } from '../day-picker';
import { ModeToggle } from '../mode-toggle';
import { ExportLink } from '../export-link';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { StatCard } from '@/components/ui/stat-card';
import { TableWrap, Th, Td, Tr } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PieChartIcon, CreditCardIcon, BarChartIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

function dateLabelOf(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; year?: string; month?: string; date?: string }>;
}) {
  const p = await searchParams;
  const mode = p.mode === 'day' ? 'day' : 'month';

  const dateKey = p.date ?? toDateKey(new Date());
  const fallback = currentMonth();
  const year = Number(p.year) || fallback.year;
  const month = Number(p.month) || fallback.month;

  const agg = aggregate(mode === 'day' ? await loadDay(dateKey) : await loadMonth(year, month));
  const eyebrow = mode === 'day' ? dateLabelOf(dateKey) : monthLabel(year, month);
  const emptyDescription = mode === 'day' ? `Nobody worked on ${eyebrow}.` : `Nothing logged for ${eyebrow}.`;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title={mode === 'day' ? 'Daily Summary' : 'Monthly Summary'}
        eyebrow={eyebrow}
        icon={<PieChartIcon />}
        action={<HeroStat value={money(agg.totals.pay)} label="total payroll" />}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ModeToggle mode={mode} basePath="/reports/summary" />
        <ExportLink
          href={
            mode === 'day'
              ? `/reports/summary/export?mode=day&date=${dateKey}`
              : `/reports/summary/export?mode=month&year=${year}&month=${month}`
          }
        />
      </div>

      {mode === 'day' ? <DayPicker date={dateKey} /> : <MonthPicker year={year} month={month} />}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard icon={<CreditCardIcon width={16} height={16} />} label="To pay workers" value={money(agg.totals.pay)} />
        <StatCard icon={<BarChartIcon width={16} height={16} />} label="To collect from companies" value={money(agg.totals.pay)} />
      </div>

      {agg.totals.days === 0 ? (
        <EmptyState title="No attendance recorded" description={emptyDescription} />
      ) : (
        <>
          <h2 className="mb-2 font-semibold">Workers — to pay</h2>
          <div className="mb-8">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Worker</Th>
                  <Th right>Days</Th>
                  <Th right>OT hrs</Th>
                  <Th right>Pay</Th>
                </tr>
              </thead>
              <tbody>
                {[...agg.byWorker.values()].map((b) => (
                  <Tr key={b.id}>
                    <Td>{b.name}</Td>
                    <Td right>{b.days}</Td>
                    <Td right>{hours(b.otHours)}</Td>
                    <Td right>{money(b.pay)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
          </div>

          <h2 className="mb-2 font-semibold">Companies — to collect</h2>
          <TableWrap>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th right>Man-days</Th>
                <Th right>OT hrs</Th>
                <Th right>Billed</Th>
              </tr>
            </thead>
            <tbody>
              {[...agg.byCompany.values()].map((b) => (
                <Tr key={b.id}>
                  <Td>{b.name}</Td>
                  <Td right>{b.days}</Td>
                  <Td right>{hours(b.otHours)}</Td>
                  <Td right>{money(b.pay)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}
    </main>
  );
}
