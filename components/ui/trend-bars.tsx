'use client';

import { useState } from 'react';

interface TrendPoint {
  label: string;
  value: number;
  formattedValue: string;
}

/**
 * Column chart for a short time series. `emphasizeLast` implements the
 * "emphasis" form — one period is the point (accent), the rest are context
 * (muted gray) — for month-over-month trend, where "where are we now vs
 * history" is the story. Without it every bar is the same hue, for a plain
 * within-period trend where no single point is special.
 *
 * Every bar responds to hover, keyboard focus, and tap: the value slot above
 * the bars and the label below it switch to whichever bar is active, so a
 * reader can find any point's exact number without guessing from bar height.
 */
export function TrendBars({
  points,
  emphasizeLast = false,
  showLabels = true,
}: {
  points: TrendPoint[];
  emphasizeLast?: boolean;
  /** Off for dense series (e.g. every day of a month) where ~30 tick labels would collide. */
  showLabels?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.value), 1);
  const lastIndex = points.length - 1;
  const defaultShown = emphasizeLast ? lastIndex : null;
  const shown = active ?? defaultShown;

  return (
    <div className="flex h-36 items-stretch gap-1 sm:gap-2">
      {points.map((p, i) => {
        const heightPct = Math.max((p.value / max) * 100, 2);
        const isActive = active === i;
        const isShown = shown === i;
        const isEmphasized = !emphasizeLast || i === lastIndex;

        return (
          <button
            key={i}
            type="button"
            className="group flex min-w-0 flex-1 flex-col items-center rounded-md border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(i)}
            aria-label={`${p.label}: ${p.formattedValue}`}
          >
            <div className="flex h-5 items-end">
              {isShown && (
                <span className={`tabular text-xs font-semibold ${isActive ? 'text-accent' : 'text-text-base'}`}>
                  {p.formattedValue}
                </span>
              )}
            </div>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-9 rounded-t-md transition-all ${
                  isActive
                    ? 'bg-accent'
                    : isEmphasized
                      ? 'bg-accent/80 group-hover:bg-accent'
                      : 'bg-border-strong group-hover:bg-accent/50'
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            {(showLabels || isActive) && (
              <span className={`mt-1.5 truncate text-[11px] ${isActive ? 'font-medium text-accent' : 'text-text-muted'}`}>
                {p.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
