'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { HeatCell, MonthMarker } from '@/lib/attendance';

interface TooltipState {
  cell: HeatCell;
  /** Viewport coordinates of the hovered box, for a position:fixed tooltip. */
  left: number;
  top: number;
  bottom: number;
}

const CELL = 10;
const GAP = 3;
const LABEL_ROW = 14;
// GitHub shows every other weekday label (Mon/Wed/Fri) to keep the gutter narrow.
const ROW_LABELS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

/** GitHub-style intensity level, 0 (no attendance) to 4 (near-full attendance). */
function levelFor(present: number, total: number): 0 | 1 | 2 | 3 | 4 {
  if (present <= 0 || total <= 0) return 0;
  const ratio = present / total;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** Same green ramp used for both the grid cells and the legend swatches. */
const LEVEL_STYLE: Record<0 | 1 | 2 | 3 | 4, React.CSSProperties> = {
  0: { background: 'var(--surface-sunken)' },
  1: { background: 'color-mix(in srgb, var(--success) 25%, var(--surface-sunken))' },
  2: { background: 'color-mix(in srgb, var(--success) 50%, var(--surface-sunken))' },
  3: { background: 'color-mix(in srgb, var(--success) 75%, var(--surface-sunken))' },
  4: { background: 'color-mix(in srgb, var(--success), black 15%)' },
};

function dateLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * A GitHub-contribution-graph-style calendar: one tiny square per day,
 * weeks running left-to-right as columns and weekdays top-to-bottom as
 * rows, shaded darker green the larger the share of the workforce present.
 * Each box links to that day's worker report — full attendance, company,
 * and OT for the date — so clicking a day is the drill-down.
 *
 * The tooltip uses `position: fixed` from the hovered box's own
 * getBoundingClientRect() rather than CSS grid placement, because the grid
 * sits inside an overflow-x-auto strip: anything overflowing that strip's
 * own box (a tooltip popping above/below a cell) would need scrolling to
 * reach rather than just being visible. Fixed positioning is viewport-
 * relative, so it escapes that clipping and tracks the exact box under the
 * cursor regardless of how far the strip is scrolled.
 */
export function AttendanceHeatmap({
  cells,
  monthMarkers,
  weeksCount,
}: {
  cells: HeatCell[];
  monthMarkers: MonthMarker[];
  weeksCount: number;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  function show(cell: HeatCell, target: HTMLElement) {
    const r = target.getBoundingClientRect();
    setTooltip({ cell, left: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2">
          <div
            className="shrink-0"
            style={{ display: 'grid', gridTemplateRows: `${LABEL_ROW}px repeat(7, ${CELL}px)`, rowGap: GAP }}
          >
            <div />
            {Array.from({ length: 7 }, (_, row) => (
              <div key={row} className="flex items-center text-[10px] leading-none text-text-muted">
                {ROW_LABELS[row] ?? ''}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${weeksCount}, ${CELL}px)`,
              gridTemplateRows: `${LABEL_ROW}px repeat(7, ${CELL}px)`,
              columnGap: GAP,
              rowGap: GAP,
            }}
          >
            {monthMarkers.map((m) => (
              <div
                key={m.col}
                className="text-[10px] leading-none text-text-muted"
                style={{ gridColumn: m.col + 1, gridRow: 1 }}
              >
                {m.label}
              </div>
            ))}
            {cells.map((c) => {
              const level = levelFor(c.present, c.total);
              return (
                <Link
                  key={c.dateKey}
                  href={`/reports/worker?mode=day&date=${c.dateKey}`}
                  className="rounded-[2px] border border-border-base focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{ gridColumn: c.col + 1, gridRow: c.row + 2, ...LEVEL_STYLE[level] }}
                  onMouseEnter={(e) => show(c, e.currentTarget)}
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={(e) => show(c, e.currentTarget)}
                  onBlur={() => setTooltip(null)}
                  aria-label={`${dateLabel(c.dateKey)}: ${c.present}/${c.total} workers present. View that day's report.`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-text-muted">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span key={level} className="h-2.5 w-2.5 rounded-[2px] border border-border-base" style={LEVEL_STYLE[level]} />
        ))}
        <span>More</span>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1f2328] px-2 py-1 text-[11px] font-medium text-white shadow-lg"
          style={{ left: tooltip.left, top: tooltip.bottom + 6 }}
        >
          {dateLabel(tooltip.cell.dateKey)} — {tooltip.cell.present}/{tooltip.cell.total} present · click for details
          <span className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-4 border-t-0 border-transparent border-b-[#1f2328]" />
        </div>
      )}
    </div>
  );
}
