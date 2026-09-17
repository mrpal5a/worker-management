'use client';

import { useRef, useState, useTransition } from 'react';
import { createWorker } from '@/app/actions/registers';

export function WorkerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createWorker(formData);
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
          placeholder="Name"
          required
          className="min-w-40 flex-1 rounded border px-3 py-2"
        />
        <input name="phone" placeholder="Phone (optional)" className="w-40 rounded border px-3 py-2" />
        <input
          name="payRate"
          type="number"
          step="0.01"
          min="0"
          placeholder="Day rate"
          required
          className="w-32 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? '…' : 'Add'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
