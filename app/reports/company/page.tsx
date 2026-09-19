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
import { TableWrap, Th, Td, Tr } from '@/components/ui/table';
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
                  const bill = calcPay(r.payRate, r.otHours);
                  return (
                    <Tr key={r.workerId}>
                      <Td>{r.workerName}</Td>
                      <Td right>{hours(r.otHours)}</Td>
                      <Td right>{money(bill)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <Td>{detail.length} workers</Td>
                  <Td right>{hours(bucket.otHours)}</Td>
                  <Td right>{money(bucket.pay)}</Td>
                </tr>
              </tfoot>
            </TableWrap>
          </>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th right>Workers</Th>
                <Th right>OT hrs</Th>
                <Th right>Billed</Th>
              </tr>
            </thead>
            <tbody>
              {companies.map((b) => (
                <Tr key={b.id}>
                  <Td>
                    <Link href={`/reports/company?mode=day&date=${dateKey}&companyId=${b.id}`} className="text-accent hover:underline">
                      {b.name}
                    </Link>
                  </Td>
                  <Td right>{b.days}</Td>
                  <Td right>{hours(b.otHours)}</Td>
                  <Td right>{money(b.pay)}</Td>
                </Tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <Td>{companies.length} companies</Td>
                <Td />
                <Td />
                <Td right>{money(agg.totals.pay)}</Td>
              </tr>
            </tfoot>
          </TableWrap>
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
              const bill = calcPay(r.payRate, r.otHours);
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
              <Td right>{money(bucket.pay)}</Td>
            </tr>
          </tfoot>
        </TableWrap>
      )}
    </main>
  );
}
