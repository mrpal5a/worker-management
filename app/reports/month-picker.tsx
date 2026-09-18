import { MONTH_NAMES } from '@/lib/format';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
    <form className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
      <Button type="submit">View</Button>
    </form>
  );
}
