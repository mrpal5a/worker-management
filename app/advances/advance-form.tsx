'use client';

import { useRef, useState, useTransition } from 'react';
import { createAdvance } from '@/app/actions/advances';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';

interface WorkerOption {
  id: string;
  name: string;
}

export function AdvanceForm({ workers }: { workers: WorkerOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAdvance(formData);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <div className="mb-8 rounded-xl border border-border-base bg-surface-raised p-3 shadow-sm sm:p-4">
      <form ref={formRef} action={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select name="workerId" required defaultValue="" className="flex-1 sm:min-w-40">
          <option value="" disabled>
            Worker
          </option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <Input name="principal" type="number" step="0.01" min="0.01" placeholder="Advance amount" required className="sm:w-36" />
        <Input
          name="monthlyDeduction"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Monthly deduction"
          required
          className="sm:w-36"
        />
        <Input name="openingPaid" type="number" step="0.01" min="0" placeholder="Already paid (optional)" className="sm:w-40" />
        <Input name="note" placeholder="Note (optional)" className="flex-1 sm:min-w-32" />
        <Button type="submit" loading={pending}>
          {!pending && <PlusIcon width={16} height={16} />}
          {pending ? 'Adding…' : 'Add advance'}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
