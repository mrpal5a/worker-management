'use client';

import { useState, useTransition } from 'react';
import { setAttendance, clearAttendance } from '@/app/actions/attendance';

interface Props {
  dateKey: string;
  workerId: string;
  workerName: string;
  companies: { id: string; name: string }[];
  initialCompanyId: string | null;
  initialOt: string;
}

/**
 * One worker's entry for one day.
 *
 * Renders as a two-line block on a phone — name above, controls below — and as
 * a grid row from the `sm` breakpoint up. One component serves both, so the
 * two layouts cannot drift apart.
 */
export function AttendanceRow({
  dateKey,
  workerId,
  workerName,
  companies,
  initialCompanyId,
  initialOt,
}: Props) {
  const [companyId, setCompanyId] = useState(initialCompanyId ?? '');
  const [ot, setOt] = useState(initialOt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCompanyChange(next: string) {
    const previous = companyId;
    setCompanyId(next);
    setError(null);

    startTransition(async () => {
      if (next === '') {
        await clearAttendance(dateKey, workerId);
        setOt('0');
        return;
      }
      const result = await setAttendance(dateKey, workerId, next, ot);
      if ('error' in result) {
        setError(result.error);
        setCompanyId(previous); // roll back the optimistic change
      }
    });
  }

  function onOtCommit(next: string) {
    if (!companyId) return;
    setError(null);

    startTransition(async () => {
      const result = await setAttendance(dateKey, workerId, companyId, next);
      if ('error' in result) {
        setError(result.error);
        setOt(initialOt);
      }
    });
  }

  return (
    <li
      className={`border-b border-border-base py-3 sm:grid sm:grid-cols-[1fr_2fr_6rem] sm:items-center sm:gap-3 sm:py-2 ${
        pending ? 'opacity-50' : ''
      }`}
    >
      <div className="mb-2 font-medium sm:mb-0">
        {workerName}
        {error && <div className="text-xs font-normal text-danger">{error}</div>}
      </div>

      <div className="flex gap-2 sm:contents">
        <select
          value={companyId}
          onChange={(e) => onCompanyChange(e.target.value)}
          aria-label={`Company for ${workerName}`}
          className="flex-1 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8"
        >
          <option value="">— Absent —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="0.5"
          min="0"
          max="24"
          value={ot}
          disabled={!companyId}
          onChange={(e) => setOt(e.target.value)}
          onBlur={(e) => onOtCommit(e.target.value)}
          aria-label={`Overtime hours for ${workerName}`}
          className="w-20 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8 disabled:bg-surface-sunken sm:w-full"
        />
      </div>
    </li>
  );
}
