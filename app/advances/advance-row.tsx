'use client';

import { useState, useTransition } from 'react';
import Decimal from 'decimal.js';
import { recordAdvancePayment, deleteAdvancePayment, deleteAdvance } from '@/app/actions/advances';
import { outstandingBalance, suggestedDeduction } from '@/lib/advances';
import { toDecimal } from '@/lib/num';
import { money } from '@/lib/format';
import { toDateKey } from '@/lib/date';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Td, Tr } from '@/components/ui/table';
import type { Numeric } from '@/lib/supabase';

interface Payment {
  id: string;
  paidOn: string;
  amount: Numeric;
  note: string | null;
}

interface Props {
  id: string;
  workerName: string;
  principal: Numeric;
  monthlyDeduction: Numeric;
  note: string | null;
  payments: Payment[];
}

export function AdvanceRow({ id, workerName, principal, monthlyDeduction, note, payments }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const principalD = toDecimal(principal);
  const monthlyD = toDecimal(monthlyDeduction);
  const paid = payments.reduce((a, p) => a.plus(toDecimal(p.amount)), new Decimal(0));
  const balance = outstandingBalance(principalD, paid);
  const suggested = suggestedDeduction(principalD, paid, monthlyD);
  const settled = balance.isZero();

  const sortedPayments = [...payments].sort((a, b) => b.paidOn.localeCompare(a.paidOn));

  function record(amount: string, dateKey: string) {
    setError(null);
    startTransition(async () => {
      const result = await recordAdvancePayment(id, amount, dateKey);
      if ('error' in result) setError(result.error);
    });
  }

  function onCustomSubmit(formData: FormData) {
    const amount = String(formData.get('amount') ?? '');
    const dateKey = String(formData.get('paidOn') ?? toDateKey(new Date()));
    record(amount, dateKey);
  }

  function onDelete(paymentId: string) {
    startTransition(() => deleteAdvancePayment(paymentId));
  }

  function onDeleteAdvance() {
    startTransition(() => deleteAdvance(id));
  }

  return (
    <>
      <Tr>
        <Td>{workerName}</Td>
        <Td right>{money(principalD)}</Td>
        <Td right>{money(paid)}</Td>
        <Td right>
          <span className="font-semibold">{money(balance)}</span>
        </Td>
        <Td right>{money(monthlyD)}</Td>
        <Td right>
          <Badge tone={settled ? 'success' : 'accent'}>{settled ? 'Settled' : 'Active'}</Badge>
        </Td>
        <Td right>
          <div className="flex items-center justify-end gap-1.5">
            {!settled && (
              <Button
                variant="secondary"
                className="!min-h-0 px-2 py-1 text-xs"
                disabled={pending}
                onClick={() => record(suggested.toString(), toDateKey(new Date()))}
              >
                Record {money(suggested)}
              </Button>
            )}
            <Button variant="ghost" className="!min-h-0 px-2 py-1 text-xs" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Hide' : 'Details'}
            </Button>
          </div>
        </Td>
      </Tr>
      {expanded && (
        <tr className="border-b border-border-base bg-surface-sunken/40">
          <td colSpan={7} className="px-2 py-3">
            {note && <p className="mb-2 text-sm text-text-muted">Note: {note}</p>}
            {error && <p className="mb-2 text-sm text-danger">{error}</p>}

            <form action={onCustomSubmit} className="mb-3 flex flex-wrap items-center gap-2">
              <Input
                name="paidOn"
                type="date"
                defaultValue={toDateKey(new Date())}
                max={toDateKey(new Date())}
                className="w-40"
              />
              <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Custom amount" required className="w-36" />
              <Button type="submit" variant="secondary" className="!min-h-0 px-3 py-1.5 text-xs" loading={pending}>
                Add payment
              </Button>
            </form>

            {sortedPayments.length === 0 ? (
              <p className="text-sm text-text-muted">No repayments recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {sortedPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-muted">
                      {p.paidOn}
                      {p.note ? ` — ${p.note}` : ''}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular font-medium">{money(toDecimal(p.amount))}</span>
                      <Button
                        variant="ghost"
                        className="!min-h-0 px-1.5 py-0.5 text-xs text-danger hover:bg-danger-soft"
                        disabled={pending}
                        onClick={() => onDelete(p.id)}
                      >
                        Remove
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border-base pt-3">
              {confirmDelete ? (
                <>
                  <span className="text-sm text-text-muted">Delete this advance and its repayment history?</span>
                  <Button
                    variant="danger"
                    className="!min-h-0 px-2.5 py-1 text-xs"
                    disabled={pending}
                    onClick={onDeleteAdvance}
                  >
                    Yes, delete
                  </Button>
                  <Button
                    variant="ghost"
                    className="!min-h-0 px-2.5 py-1 text-xs"
                    disabled={pending}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  className="!min-h-0 px-2.5 py-1 text-xs text-danger hover:bg-danger-soft"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete advance
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
