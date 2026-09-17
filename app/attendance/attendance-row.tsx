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
    <tr className={`border-b ${pending ? 'opacity-50' : ''}`}>
      <td className="py-2">
        {workerName}
        {error && <div className="text-xs text-red-600">{error}</div>}
      </td>
      <td>
        <select
          value={companyId}
          onChange={(e) => onCompanyChange(e.target.value)}
          className="w-full rounded border px-2 py-1"
        >
          <option value="">— Absent —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td className="w-24">
        <input
          type="number"
          step="0.5"
          min="0"
          max="24"
          value={ot}
          disabled={!companyId}
          onChange={(e) => setOt(e.target.value)}
          onBlur={(e) => onOtCommit(e.target.value)}
          className="w-full rounded border px-2 py-1 disabled:bg-gray-100"
        />
      </td>
    </tr>
  );
}
