import { MONTH_NAMES } from '@/lib/format';

/**
 * Shared month/year selector. Plain GET form so report URLs stay shareable
 * and bookmarkable.
 */
export function MonthPicker({
  year,
  month,
  children,
}: {
  year: number;
  month: number;
  children?: React.ReactNode;
}) {
  const years = [year - 1, year, year + 1];

  return (
    <form className="mb-6 flex flex-wrap gap-2">
      {children}
      <select name="month" defaultValue={month} className="min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8">
        {MONTH_NAMES.map((label, i) => (
          <option key={label} value={i + 1}>
            {label}
          </option>
        ))}
      </select>
      <select name="year" defaultValue={year} className="min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8">
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover sm:min-h-9">View</button>
    </form>
  );
}
