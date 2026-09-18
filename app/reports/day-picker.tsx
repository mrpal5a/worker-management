'use client';

import { Input } from '@/components/ui/input';

/**
 * Single-date selector for the day-wise view of a report. Mirrors
 * MonthPicker: a plain GET form that submits itself on change, so picking a
 * date filters immediately with no separate "View" step.
 */
export function DayPicker({ date }: { date: string }) {
  return (
    <form
      className="mb-6 flex flex-wrap items-center gap-2"
      onChange={(e) => e.currentTarget.requestSubmit()}
    >
      <input type="hidden" name="mode" value="day" />
      <Input type="date" name="date" defaultValue={date} className="w-auto" />
    </form>
  );
}
