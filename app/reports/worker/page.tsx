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
import { FileTextIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

function dateLabelOf(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function WorkerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; year?: string; month?: string; workerId?: string; date?: string }>;
}) {
  const p = await searchParams;
  const mode = p.mode === 'day' ? 'day' : 'month';

  if (mode === 'day') {
    const dateKey = p.date ?? toDateKey(new Date());
    const dayRows = await loadDay(dateKey);
    const agg = aggregate(dayRows);
    const dateLabel = dateLabelOf(dateKey);
    const workers = [...agg.byWorker.values()];
    // One entry per worker per day, so each worker maps to exactly one company.
    const companyOf = new Map(dayRows.map((r) => [r.workerId, r.companyName]));

    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <PageHeader
          title="Worker Report"
          eyebrow={dateLabel}
          icon={<FileTextIcon />}
          action={<HeroStat value={money(agg.totals.pay)} label="total pay" />}
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ModeToggle mode="day" basePath="/reports/worker" />
          <ExportLink href={`/reports/worker/export?mode=day&date=${dateKey}`} />
        </div>
        <DayPicker date={dateKey} />

        {workers.length === 0 ? (
          <EmptyState title="No attendance recorded" description={`Nobody worked on ${dateLabel}.`} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Worker</Th>
                <Th>Company</Th>
                <Th right>OT hrs</Th>
                <Th right>Pay</Th>
              </tr>
            </thead>
            <tbody>
              {workers.map((b) => (
                <Tr key={b.id}>
                  <Td>{b.name}</Td>
                  <Td>{companyOf.get(b.id) ?? '—'}</Td>
                  <Td right>{hours(b.otHours)}</Td>
                  <Td right>{money(b.pay)}</Td>
                </Tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <Td>{workers.length} workers</Td>
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ModeToggle mode="month" basePath="/reports/worker" />
        <ExportLink
          href={`/reports/worker/export?mode=month&year=${year}&month=${month}${workerId ? `&workerId=${workerId}` : ''}`}
        />
      </div>

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
              const pay = calcPay(r.payRate, r.otHours);
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
