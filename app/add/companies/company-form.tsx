'use client';

import { useRef, useState, useTransition } from 'react';
import { createCompany } from '@/app/actions/registers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';

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
    <div className="mb-8 rounded-xl border border-border-base bg-surface-raised p-3 shadow-sm sm:p-4">
      <form ref={formRef} action={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input name="name" placeholder="Company name" required className="flex-1 sm:min-w-40" />
        <Button type="submit" loading={pending}>
          {!pending && <PlusIcon width={16} height={16} />}
          {pending ? 'Adding…' : 'Add'}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
