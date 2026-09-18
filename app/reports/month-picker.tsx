'use client';

import { MONTH_NAMES } from '@/lib/format';
import { Select } from '@/components/ui/select';

/**
 * Shared month/year selector. Plain GET form so report URLs stay shareable
 * and bookmarkable — changing any field submits it immediately (via the
 * form's own onChange, which catches every descendant field including the
 * entity select a page injects as `children`), so there is no separate
 * "View" step.
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
    <form
      className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      onChange={(e) => e.currentTarget.requestSubmit()}
    >
      <input type="hidden" name="mode" value="month" />
      {children}
      <Select name="month" defaultValue={month} className="sm:w-auto">
        {MONTH_NAMES.map((label, i) => (
          <option key={label} value={i + 1}>
            {label}
          </option>
        ))}
      </Select>
      <Select name="year" defaultValue={year} className="sm:w-auto">
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </form>
  );
}
