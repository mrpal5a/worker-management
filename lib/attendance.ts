import type { ReportRow } from './reports';
import { MONTH_NAMES } from './format';

/**
 * Grid geometry for a GitHub-style contribution calendar — pure, like
 * `reports.ts`'s `aggregate`, so it's testable without a database. Loading
 * the rows is `lib/repo.ts`'s job.
 */

export interface HeatCell {
  dateKey: string;
  /** 0 = Sunday .. 6 = Saturday — the grid row this day sits in. */
  row: number;
  /** Week index from the grid's start — the grid column this day sits in. */
  col: number;
  present: number;
  total: number;
}

export interface MonthMarker {
  col: number;
  label: string;
}

export interface AttendanceHeatmap {
  cells: HeatCell[];
  monthMarkers: MonthMarker[];
  weeksCount: number;
  avgAttendance: number;
}

/**
 * Weeks as columns, Sun-Sat as rows, spanning from the start of the oldest
 * given month through `today`. `months` must be oldest-first (as returned
 * by `lastNMonths`) and `totalWorkers` is applied uniformly across the
 * whole range — this app doesn't track historical workforce size, so every
 * day's ratio is against today's active headcount.
 */
export function buildAttendanceHeatmap(
  rows: ReportRow[],
  months: { year: number; month: number }[],
  totalWorkers: number,
  today: Date,
): AttendanceHeatmap {
  const dailyPresent = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!dailyPresent.has(r.dateKey)) dailyPresent.set(r.dateKey, new Set());
    dailyPresent.get(r.dateKey)!.add(r.workerId);
  }

  const dataStart = Date.UTC(months[0].year, months[0].month - 1, 1);
  const dataEnd = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const gridStart = dataStart - new Date(dataStart).getUTCDay() * 86400000;
  const totalDays = Math.round((dataEnd - dataStart) / 86400000) + 1;

  const cells: HeatCell[] = [];
  const monthMarkers: MonthMarker[] = [];
  for (let i = 0; i < totalDays; i++) {
    const t = dataStart + i * 86400000;
    const d = new Date(t);
    const dateKey = d.toISOString().slice(0, 10);
    const dayIndexFromGridStart = Math.round((t - gridStart) / 86400000);
    const row = dayIndexFromGridStart % 7;
    const col = Math.floor(dayIndexFromGridStart / 7);
    cells.push({ dateKey, row, col, present: dailyPresent.get(dateKey)?.size ?? 0, total: totalWorkers });
    if (d.getUTCDate() === 1) {
      monthMarkers.push({ col, label: MONTH_NAMES[d.getUTCMonth()].slice(0, 3) });
    }
  }
  const weeksCount = cells.length > 0 ? cells[cells.length - 1].col + 1 : 0;

  const attendanceDays = cells.filter((c) => c.present > 0);
  const avgAttendance =
    attendanceDays.length > 0
      ? Math.round(attendanceDays.reduce((a, c) => a + c.present, 0) / attendanceDays.length)
      : 0;

  return { cells, monthMarkers, weeksCount, avgAttendance };
}
