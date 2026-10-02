'use client';

import { useState, useTransition } from 'react';
import { setAttendance, clearAttendance, type DayFraction } from '@/app/actions/attendance';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSearchMatch } from '@/components/ui/search';
import { calcPay } from '@/lib/payroll';
import { toDecimal } from '@/lib/num';
import { money } from '@/lib/format';

interface Props {
  dateKey: string;
  workerId: string;
  workerName: string;
  companies: { id: string; name: string }[];
  initialCompanyId: string | null;
  initialOt: string;
  initialDayFraction: DayFraction;
  /** Day rate used for the pay preview: the entry's snapshot, else the current rate. */
  payRate: string;
  /** Searchable text for this row: the worker's name and phone. */
  searchText: string;
}

/**
 * One worker's entry for one day.
 *
 * Renders as a two-line block on a phone — name and pay above, controls below —
 * and as a grid row from the `sm` breakpoint up. One component serves both, so
 * the two layouts cannot drift apart.
 */
export function AttendanceRow({
  dateKey,
  workerId,
  workerName,
  companies,
  initialCompanyId,
  initialOt,
  initialDayFraction,
  payRate,
  searchText,
}: Props) {
  const [companyId, setCompanyId] = useState(initialCompanyId ?? '');
  const [ot, setOt] = useState(initialOt);
  const [dayFraction, setDayFraction] = useState<DayFraction>(initialDayFraction);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hidden = !useSearchMatch(searchText);

  const present = companyId !== '';
  const half = dayFraction === '0.5';
  const otNumber = Number(ot);
  const pay =
    present && Number.isFinite(otNumber) && otNumber >= 0
      ? calcPay(toDecimal(payRate), toDecimal(ot || '0'), toDecimal(dayFraction))
      : null;

  function onCompanyChange(next: string) {
    const previous = companyId;
    setCompanyId(next);
    setError(null);

    startTransition(async () => {
      if (next === '') {
        await clearAttendance(dateKey, workerId);
        setOt('0');
        setDayFraction('1');
        return;
      }
      const result = await setAttendance(dateKey, workerId, next, ot, dayFraction);
      if ('error' in result) {
        setError(result.error);
        setCompanyId(previous); // roll back the optimistic change
      }
    });
  }

  function onOtCommit(next: string) {
    if (!present) return;
    setError(null);

    startTransition(async () => {
      const result = await setAttendance(dateKey, workerId, companyId, next, dayFraction);
      if ('error' in result) {
        setError(result.error);
        setOt(initialOt);
      }
    });
  }

  function onDayFractionChange(next: DayFraction) {
    if (!present || next === dayFraction) return;
    const previous = dayFraction;
    setDayFraction(next);
    setError(null);

    startTransition(async () => {
      const result = await setAttendance(dateKey, workerId, companyId, ot, next);
      if ('error' in result) {
        setError(result.error);
        setDayFraction(previous);
      }
    });
  }

  return (
    <li
      className={`border-b border-border-base py-3 transition-opacity sm:grid-cols-[1fr_2fr_7.5rem_5rem_6rem] sm:items-center sm:gap-3 sm:py-2 ${
        hidden ? 'hidden' : 'sm:grid'
      } ${pending ? 'opacity-50' : ''}`}
    >
      {/* Phone: name left, pay right. From sm up, both become grid cells. */}
      <div className="mb-2 flex items-start justify-between gap-2 sm:contents">
        <div className="flex items-center gap-2 font-medium">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              !present ? 'bg-border-strong' : half ? 'bg-warning' : 'bg-success'
            }`}
          />
          <span>
            {workerName}
            {error && <div className="text-xs font-normal text-danger">{error}</div>}
          </span>
        </div>

        <div className="text-right text-sm tabular-nums sm:order-last" aria-live="polite">
          {pay ? (
            <span className="font-medium">
              {money(pay)}
              {half && <span className="ml-1 text-xs font-normal text-warning">½</span>}
            </span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 sm:contents">
        <Select
          value={companyId}
          onChange={(e) => onCompanyChange(e.target.value)}
          aria-label={`Company for ${workerName}`}
          className="min-w-0 flex-1"
        >
          <option value="">— Absent —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <DayToggle
          value={dayFraction}
          disabled={!present}
          onChange={onDayFractionChange}
          workerName={workerName}
        />

        <Input
          type="number"
          step="0.5"
          min="0"
          max="24"
          value={ot}
          disabled={!present}
          onChange={(e) => setOt(e.target.value)}
          onBlur={(e) => onOtCommit(e.target.value)}
          aria-label={`Overtime hours for ${workerName}`}
          className="w-16 sm:w-full"
        />
      </div>
    </li>
  );
}

/** Full / Half segmented switch — one tap to change, no dropdown to open. */
function DayToggle({
  value,
  disabled,
  onChange,
  workerName,
}: {
  value: DayFraction;
  disabled: boolean;
  onChange: (next: DayFraction) => void;
  workerName: string;
}) {
  const options: { value: DayFraction; label: string; active: string }[] = [
    { value: '1', label: 'Full', active: 'bg-surface text-text-base shadow-sm' },
    { value: '0.5', label: 'Half', active: 'bg-warning-soft text-warning shadow-sm' },
  ];

  return (
    <div
      role="group"
      aria-label={`Full or half day for ${workerName}`}
      className={`inline-flex min-h-9 shrink-0 rounded-md border border-border-strong bg-surface-sunken p-0.5 sm:min-h-8 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {options.map((o) => {
        // Full shows as selected even on an absent row: it is the default the
        // entry will be saved with when the worker is marked present.
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded px-2.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed ${
              selected ? o.active : 'text-text-muted hover:text-text-base'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
