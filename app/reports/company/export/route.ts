import type { NextRequest } from 'next/server';
import { loadMonth, loadDay } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { calcPay } from '@/lib/payroll';
import { toDateKey } from '@/lib/date';
import { currentMonth } from '@/lib/format';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const mode = sp.get('mode') === 'day' ? 'day' : 'month';

  if (mode === 'day') {
    const dateKey = sp.get('date') ?? toDateKey(new Date());
    const agg = aggregate(await loadDay(dateKey));

    const csvRows = [...agg.byCompany.values()].map((b) => [
      dateKey,
      b.name,
      b.days,
      b.otHours.toString(),
      b.pay.toFixed(2),
    ]);
    const csv = toCsv(['Date', 'Company', 'Workers', 'OT hours', 'Billed (INR)'], csvRows);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="company-report-${dateKey}.csv"`,
      },
    });
  }

  const fallback = currentMonth();
  const year = Number(sp.get('year')) || fallback.year;
  const month = Number(sp.get('month')) || fallback.month;

  const rows = await loadMonth(year, month);
  const agg = aggregate(rows);

  const companyIds = [...agg.byCompany.keys()];
  const companyId =
    sp.get('companyId') && agg.byCompany.has(sp.get('companyId')!) ? sp.get('companyId')! : companyIds[0];
  const detail = rows.filter((r) => r.companyId === companyId);
  const companyName = companyId ? agg.byCompany.get(companyId)!.name : 'company';

  const csvRows = detail.map((r) => [
    r.dateKey,
    r.workerName,
    r.otHours.toString(),
    calcPay(r.payRate, r.otHours).toFixed(2),
  ]);
  const csv = toCsv(['Date', 'Worker', 'OT hours', 'Billed (INR)'], csvRows);
  const safeName = companyName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="company-report-${safeName}-${year}-${String(month).padStart(2, '0')}.csv"`,
    },
  });
}
