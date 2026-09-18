import Decimal from 'decimal.js';
import { listWorkers, listCompanies, loadMonth } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { calcPay, sum } from '@/lib/payroll';
import { money, currentMonth, monthLabel, MONTH_NAMES } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { BarList } from '@/components/ui/bar-list';
import { TrendBars } from '@/components/ui/trend-bars';
import { ShareBar } from '@/components/ui/share-bar';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AwardIcon,
  UsersIcon,
  BriefcaseIcon,
  ClockIcon,
  TrendingUpIcon,
} from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
];

const TREND_MONTHS = 6;

function lastNMonths(year: number, month: number, n: number): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    out.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }
  return out;
}

export default async function InsightsPage() {
  const { year, month } = currentMonth();
  const months = lastNMonths(year, month, TREND_MONTHS);

  const [workers, companies, monthRowsList] = await Promise.all([
    listWorkers(),
    listCompanies(),
    Promise.all(months.map((m) => loadMonth(m.year, m.month))),
  ]);

  const currentRows = monthRowsList[monthRowsList.length - 1];
  const agg = aggregate(currentRows);
  const hasData = currentRows.length > 0;

  const workerList = [...agg.byWorker.values()].sort((a, b) => b.pay.minus(a.pay).toNumber());
  const companyList = [...agg.byCompany.values()].sort((a, b) => b.pay.minus(a.pay).toNumber());
  const topWorker = workerList[0];
  const topCompany = companyList[0];

  const trendPoints = months.map((m, i) => ({
    label: MONTH_NAMES[m.month - 1].slice(0, 3),
    value: aggregate(monthRowsList[i]).totals.pay.toNumber(),
  }));

  const dailyTotals = new Map<string, number>();
  for (const r of currentRows) {
    const pay = calcPay(r.payRate, r.otHours).toNumber();
    dailyTotals.set(r.dateKey, (dailyTotals.get(r.dateKey) ?? 0) + pay);
  }
  const dailyPoints = [...dailyTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, value]) => ({ label: String(Number(dateKey.slice(-2))), value }));

  const topCompanies = companyList.slice(0, 6);
  const restCompanies = companyList.slice(6);
  const restDays = restCompanies.reduce((a, c) => a + c.days, 0);
  const shareSegments = [
    ...topCompanies.map((c, i) => ({ id: c.id, label: c.name, value: c.days, color: SERIES_COLORS[i] })),
    ...(restDays > 0 ? [{ id: 'other', label: 'Other', value: restDays, color: 'var(--border-strong)' }] : []),
  ];

  const otLeaders = workerList
    .filter((w) => w.otHours.greaterThan(0))
    .sort((a, b) => b.otHours.minus(a.otHours).toNumber())
    .slice(0, 5);

  const activeWorkers = workers.filter((w) => w.active).length;
  const activeCompanies = companies.filter((c) => c.active).length;
  const avgOtPerEntry =
    currentRows.length > 0 ? sum(currentRows.map((r) => r.otHours)).dividedBy(currentRows.length) : new Decimal(0);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Insights"
        subtitle="Where your payroll and workforce actually go."
        eyebrow={monthLabel(year, month)}
        icon={<AwardIcon />}
        action={<HeroStat value={money(agg.totals.pay)} label="this month" />}
      />

      {!hasData ? (
        <EmptyState
          title="Not enough data yet"
          description="Log some attendance and insights will show up here."
        />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {topWorker && (
              <SpotlightCard
                icon={<AwardIcon width={16} height={16} />}
                eyebrow="Top worker this month"
                name={topWorker.name}
                value={money(topWorker.pay)}
                meta={`${topWorker.days} day${topWorker.days === 1 ? '' : 's'} worked`}
              />
            )}
            {topCompany && (
              <SpotlightCard
                icon={<AwardIcon width={16} height={16} />}
                eyebrow="Top company this month"
                name={topCompany.name}
                value={money(topCompany.pay)}
                meta={`${topCompany.days} man-day${topCompany.days === 1 ? '' : 's'}`}
              />
            )}
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<UsersIcon width={16} height={16} />} label="Active workers" value={String(activeWorkers)} />
            <StatCard icon={<BriefcaseIcon width={16} height={16} />} label="Active companies" value={String(activeCompanies)} />
            <StatCard icon={<ClockIcon width={16} height={16} />} label="Man-days this month" value={String(agg.totals.days)} />
            <StatCard icon={<TrendingUpIcon width={16} height={16} />} label="Avg OT / entry" value={`${avgOtPerEntry.toFixed(1)}h`} />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold">Top 5 workers by pay</h2>
              <BarList
                items={workerList.slice(0, 5).map((w) => ({
                  id: w.id,
                  label: w.name,
                  value: w.pay.toNumber(),
                  formattedValue: money(w.pay),
                }))}
              />
            </Card>
            <Card>
              <h2 className="mb-4 font-semibold">Top 5 companies by billed</h2>
              <BarList
                items={companyList.slice(0, 5).map((c) => ({
                  id: c.id,
                  label: c.name,
                  value: c.pay.toNumber(),
                  formattedValue: money(c.pay),
                }))}
              />
            </Card>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-semibold">Payroll trend</h2>
              <p className="mb-4 text-sm text-text-muted">Last {TREND_MONTHS} months</p>
              <TrendBars points={trendPoints} formatValue={(v) => money(new Decimal(v))} emphasizeLast />
            </Card>
            <Card>
              <h2 className="font-semibold">Daily payroll</h2>
              <p className="mb-4 text-sm text-text-muted">{monthLabel(year, month)}</p>
              <TrendBars
                points={dailyPoints}
                formatValue={(v) => money(new Decimal(v))}
                showLabels={dailyPoints.length <= 12}
              />
            </Card>
          </div>

          <Card className="mb-6">
            <h2 className="font-semibold">Workforce distribution</h2>
            <p className="mb-4 text-sm text-text-muted">Share of man-days by company, {monthLabel(year, month)}</p>
            <ShareBar segments={shareSegments} />
          </Card>

          {otLeaders.length > 0 && (
            <Card>
              <h2 className="mb-4 font-semibold">Most overtime this month</h2>
              <BarList
                items={otLeaders.map((w) => ({
                  id: w.id,
                  label: w.name,
                  value: w.otHours.toNumber(),
                  formattedValue: `${w.otHours.toString()}h`,
                }))}
              />
            </Card>
          )}
        </>
      )}
    </main>
  );
}
