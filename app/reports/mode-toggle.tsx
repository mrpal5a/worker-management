import Link from 'next/link';

type Mode = 'month' | 'day';

/** Switches a report between its month-wise and day-wise view. */
export function ModeToggle({ mode, basePath }: { mode: Mode; basePath: string }) {
  const tabs: { value: Mode; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'day', label: 'Day' },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border-base bg-surface-sunken p-0.5">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={`${basePath}?mode=${t.value}`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === t.value
              ? 'bg-surface-raised text-text-base shadow-sm'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
