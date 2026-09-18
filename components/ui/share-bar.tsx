interface ShareSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Part-to-whole for many/long-named categories — a single horizontal stacked
 * bar rather than a pie/donut (donut angle is hard to compare; a bar's
 * length is not). Each segment gets a fixed categorical color from the
 * validated series palette; a legend is always shown since there are >=2
 * series, so identity is never color-alone.
 */
export function ShareBar({ segments }: { segments: ShareSegment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;

  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
        {segments.map((s) => {
          const pct = (s.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={s.id}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              title={`${s.label}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-text-base">{s.label}</span>
            <span className="tabular text-text-muted">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
