'use client';

import { useRef, useState, useTransition } from 'react';
import { createCompany } from '@/app/actions/registers';

export function CompanyForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCompany(formData);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <div className="mb-8">
      <form ref={formRef} action={onSubmit} className="flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="Company name"
          required
          className="min-w-40 flex-1 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8"
        />
        <input
          name="billRate"
          type="number"
          step="0.01"
          min="0"
          placeholder="Bill rate / day"
          required
          className="w-40 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-50 sm:min-h-9"
        >
          {pending ? '…' : 'Add'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
