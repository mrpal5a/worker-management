import Link from 'next/link';
import { loadMonth, loadDay } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { calcPay } from '@/lib/payroll';
import { money, hours, currentMonth, monthLabel } from '@/lib/format';
import { toDateKey } from '@/lib/date';
import { MonthPicker } from '../month-picker';
import { DayPicker } from '../day-picker';
import { ModeToggle } from '../mode-toggle';
import { ExportLink } from '../export-link';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { Select } from '@/components/ui/select';
import { TableWrap, Th, Td } from '@/components/ui/table';
import { SearchScope, SearchTr, SearchTfoot } from '@/components/ui/search';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChartIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

function dateLabelOf(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function CompanyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; year?: string; month?: string; companyId?: string; date?: string }>;
}) {
  const p = await searchParams;
  const mode = p.mode === 'day' ? 'day' : 'month';

  if (mode === 'day') {
    const dateKey = p.date ?? toDateKey(new Date());
    const dayRows = await loadDay(dateKey);
    const agg = aggregate(dayRows);
    const dateLabel = dateLabelOf(dateKey);
    const companies = [...agg.byCompany.values()];

    const companyId = p.companyId && agg.byCompany.has(p.companyId) ? p.companyId : undefined;
    const bucket = companyId ? agg.byCompany.get(companyId) : undefined;
    const detail = bucket ? dayRows.filter((r) => r.companyId === companyId) : [];

    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <PageHeader
          title="Company Report"
          eyebrow={bucket ? `${bucket.name} — ${dateLabel}` : dateLabel}
          icon={<BarChartIcon />}
          action={<HeroStat value={money(bucket ? bucket.pay : agg.totals.pay)} label={bucket ? 'billed' : 'total billed'} />}
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ModeToggle mode="day" basePath="/reports/company" />
          <ExportLink href={`/reports/company/export?mode=day&date=${dateKey}`} />
        </div>
        <DayPicker date={dateKey} />

        {companies.length === 0 ? (
          <EmptyState title="No attendance recorded" description={`Nobody worked on ${dateLabel}.`} />
        ) : bucket ? (
          <>
            <Link
              href={`/reports/company?mode=day&date=${dateKey}`}
              className="mb-3 inline-block text-sm text-accent hover:underline"
            >
              ← All companies
            </Link>
            <SearchScope haystacks={detail.map((r) => r.workerName)} placeholder="Search workers…" noun="workers">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Worker</Th>
                    <Th right>OT hrs</Th>
                    <Th right>Billed</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.map((r) => {
                    const bill = calcPay(r.payRate, r.otHours, r.dayFraction);
                    return (
                      <SearchTr key={r.workerId} text={r.workerName}>
                        <Td>
                          {r.workerName}
                          {r.dayFraction.lessThan(1) && <Badge tone="warning" className="ml-1.5">Half day</Badge>}
                        </Td>
                        <Td right>{hours(r.otHours)}</Td>
                        <Td right>{money(bill)}</Td>
                      </SearchTr>
                    );
                  })}
                </tbody>
                <SearchTfoot
                  noun={{ one: 'worker', many: 'workers' }}
                  cells={['count', 'ot', 'amount']}
                  rows={detail.map((r) => ({
                    text: r.workerName,
                    days: r.dayFraction.toNumber(),
                    ot: r.otHours.toString(),
                    amount: calcPay(r.payRate, r.otHours, r.dayFraction).toString(),
                  }))}
                />
              </TableWrap>
            </SearchScope>
          </>
        ) : (
          <SearchScope haystacks={companies.map((b) => b.name)} placeholder="Search companies…" noun="companies">
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
                {companies.map((b) => (
                  <SearchTr key={b.id} text={b.name}>
                    <Td>
                      <Link href={`/reports/company?mode=day&date=${dateKey}&companyId=${b.id}`} className="text-accent hover:underline">
                        {b.name}
                      </Link>
                    </Td>
                    <Td right>{b.days}</Td>
                    <Td right>{hours(b.otHours)}</Td>
                    <Td right>{money(b.pay)}</Td>
                  </SearchTr>
                ))}
              </tbody>
              <SearchTfoot
                noun={{ one: 'company', many: 'companies' }}
                cells={['count', 'blank', 'blank', 'amount']}
                rows={companies.map((b) => ({
                  text: b.name,
                  days: b.days,
                  ot: b.otHours.toString(),
                  amount: b.pay.toString(),
                }))}
              />
            </TableWrap>
          </SearchScope>
        )}
      </main>
    );
  }

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
        action={bucket ? <HeroStat value={money(bucket.pay)} label="billed" /> : undefined}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ModeToggle mode="month" basePath="/reports/company" />
        <ExportLink
          href={`/reports/company/export?mode=month&year=${year}&month=${month}${companyId ? `&companyId=${companyId}` : ''}`}
        />
      </div>

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
        <SearchScope
          haystacks={detail.map((r) => `${r.workerName} ${r.dateKey}`)}
          placeholder="Search by worker or date…"
          noun="entries"
        >
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
                const bill = calcPay(r.payRate, r.otHours, r.dayFraction);
                return (
                  <SearchTr key={`${r.dateKey}-${r.workerId}`} text={`${r.workerName} ${r.dateKey}`}>
                    <Td>{r.dateKey}</Td>
                    <Td>
                      {r.workerName}
                      {r.dayFraction.lessThan(1) && <Badge tone="warning" className="ml-1.5">Half day</Badge>}
                    </Td>
                    <Td right>{hours(r.otHours)}</Td>
                    <Td right>{money(bill)}</Td>
                  </SearchTr>
                );
              })}
            </tbody>
            <SearchTfoot
              noun={{ one: 'man-day', many: 'man-days' }}
              cells={['days', 'blank', 'ot', 'amount']}
              rows={detail.map((r) => ({
                text: `${r.workerName} ${r.dateKey}`,
                days: r.dayFraction.toNumber(),
                ot: r.otHours.toString(),
                amount: calcPay(r.payRate, r.otHours, r.dayFraction).toString(),
              }))}
            />
          </TableWrap>
        </SearchScope>
      )}
    </main>
  );
}
