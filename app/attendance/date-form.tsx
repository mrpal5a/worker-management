'use client';

import { Input } from '@/components/ui/input';

/** Picking a date filters the page immediately — no separate "Go" step. */
export function DateForm({ dateKey }: { dateKey: string }) {
  return (
    <form className="mb-2 flex flex-wrap items-center gap-2" onChange={(e) => e.currentTarget.requestSubmit()}>
      <Input type="date" name="date" defaultValue={dateKey} className="w-auto" />
    </form>
  );
}
