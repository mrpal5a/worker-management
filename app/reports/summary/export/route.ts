import type { NextRequest } from 'next/server';
import { loadMonth, loadDay } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { toDateKey } from '@/lib/date';
import { currentMonth } from '@/lib/format';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/**
 * CSV export for the Summary report. Auth is enforced the same way as every
 * page: proxy.ts's matcher covers every route except static assets, so an
 * unauthenticated request never reaches here.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const mode = sp.get('mode') === 'day' ? 'day' : 'month';

  let rows;
  let filename: string;

  if (mode === 'day') {
    const dateKey = sp.get('date') ?? toDateKey(new Date());
    rows = await loadDay(dateKey);
    filename = `summary-${dateKey}.csv`;
  } else {
    const fallback = currentMonth();
    const year = Number(sp.get('year')) || fallback.year;
    const month = Number(sp.get('month')) || fallback.month;
    rows = await loadMonth(year, month);
    filename = `summary-${year}-${String(month).padStart(2, '0')}.csv`;
  }

  const agg = aggregate(rows);

  const csvRows: (string | number)[][] = [];
  for (const b of agg.byWorker.values()) {
    csvRows.push(['Worker', b.name, b.days, b.otHours.toString(), b.pay.toFixed(2)]);
  }
  for (const b of agg.byCompany.values()) {
    csvRows.push(['Company', b.name, b.days, b.otHours.toString(), b.pay.toFixed(2)]);
  }

  const csv = toCsv(['Type', 'Name', 'Days', 'OT hours', 'Amount (INR)'], csvRows);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
