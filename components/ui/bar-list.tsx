interface BarListItem {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
}

/**
 * Ranked magnitude comparison — a single sequential hue (accent), since these
 * are the same metric across many items, not distinct series that need
 * identity colors. Value always sits above the bar so it never depends on
 * the bar being wide enough to hold text.
 */
export function BarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={item.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-medium text-text-base">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-text-muted">
                {i + 1}
              </span>
              <span className="truncate">{item.label}</span>
            </span>
            <span className="tabular shrink-0 font-semibold text-text-base">{item.formattedValue}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
