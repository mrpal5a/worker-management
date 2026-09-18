interface TrendPoint {
  label: string;
  value: number;
}

/**
 * Column chart for a short time series. `emphasizeLast` implements the
 * "emphasis" form — one period is the point (accent), the rest are context
 * (muted gray) — for month-over-month trend, where "where are we now vs
 * history" is the story. Without it every bar is the same hue, for a plain
 * within-period trend where no single point is special.
 *
 * A native `title` gives every bar a hover value; only the last bar gets a
 * permanent direct label, per "label the endpoint, not every point."
 */
export function TrendBars({
  points,
  formatValue,
  emphasizeLast = false,
  showLabels = true,
}: {
  points: TrendPoint[];
  formatValue: (v: number) => string;
  emphasizeLast?: boolean;
  /** Off for dense series (e.g. every day of a month) where ~30 tick labels would collide. */
  showLabels?: boolean;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const lastIndex = points.length - 1;

  return (
    <div className="flex h-36 items-stretch gap-1 sm:gap-2">
      {points.map((p, i) => {
        const heightPct = Math.max((p.value / max) * 100, 2);
        const isLast = i === lastIndex;
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex h-5 items-end">
              {isLast && <span className="tabular text-xs font-semibold text-text-base">{formatValue(p.value)}</span>}
            </div>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-9 rounded-t-md transition-all ${
                  !emphasizeLast || isLast ? 'bg-accent' : 'bg-border-strong'
                }`}
                style={{ height: `${heightPct}%` }}
                title={`${p.label}: ${formatValue(p.value)}`}
              />
            </div>
            {showLabels && <span className="mt-1.5 truncate text-[11px] text-text-muted">{p.label}</span>}
          </div>
        );
      })}
    </div>
  );
}
