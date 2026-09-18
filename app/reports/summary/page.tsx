import { loadMonth } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { money, currentMonth, monthLabel } from '@/lib/format';
import { MonthPicker } from '../month-picker';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { StatCard } from '@/components/ui/stat-card';
import { TableWrap, Th, Td, Tr } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PieChartIcon, CreditCardIcon, BarChartIcon, TrendingUpIcon } from '@/components/ui/icons';

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
      <PageHeader
        title="Monthly Summary"
        eyebrow={monthLabel(year, month)}
        icon={<PieChartIcon />}
        action={<HeroStat value={money(agg.totals.margin)} label="margin" />}
      />

      <MonthPicker year={year} month={month} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<CreditCardIcon width={16} height={16} />} label="To pay workers" value={money(agg.totals.pay)} />
        <StatCard icon={<BarChartIcon width={16} height={16} />} label="To collect from companies" value={money(agg.totals.bill)} />
        <StatCard icon={<TrendingUpIcon width={16} height={16} />} label="Margin" value={money(agg.totals.margin)} />
      </div>

      {agg.totals.days === 0 ? (
        <EmptyState title="No attendance recorded" description={`Nothing logged for ${monthLabel(year, month)}.`} />
      ) : (
        <>
          <h2 className="mb-2 font-semibold">Workers — to pay</h2>
          <div className="mb-8">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Worker</Th>
                  <Th right>Days</Th>
                  <Th right>Pay</Th>
                </tr>
              </thead>
              <tbody>
                {[...agg.byWorker.values()].map((b) => (
                  <Tr key={b.id}>
                    <Td>{b.name}</Td>
                    <Td right>{b.days}</Td>
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
                <Th right>Billed</Th>
              </tr>
            </thead>
            <tbody>
              {[...agg.byCompany.values()].map((b) => (
                <Tr key={b.id}>
                  <Td>{b.name}</Td>
                  <Td right>{b.days}</Td>
                  <Td right>{money(b.bill)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}
    </main>
  );
}
