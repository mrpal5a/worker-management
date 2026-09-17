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
      <select name="month" defaultValue={month} className="rounded border px-3 py-2">
        {MONTH_NAMES.map((label, i) => (
          <option key={label} value={i + 1}>
            {label}
          </option>
        ))}
      </select>
      <select name="year" defaultValue={year} className="rounded border px-3 py-2">
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button className="rounded bg-black px-4 py-2 text-white">View</button>
    </form>
  );
}
