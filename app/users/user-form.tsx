'use client';

import { useRef, useState, useTransition } from 'react';
import { addUser } from '@/app/actions/users';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';

export function UserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await addUser(formData);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setDone(true);
    });
  }

  return (
    <div className="mb-8 rounded-xl border border-border-base bg-surface-raised p-4 shadow-sm">
      <h2 className="mb-3 font-medium">Add an account</h2>
      <form ref={formRef} action={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="off"
          className="flex-1 sm:min-w-48"
        />
        <Input name="name" placeholder="Name" className="flex-1 sm:min-w-32" />
        <Input
          name="password"
          type="password"
          placeholder="Password (min 8)"
          required
          minLength={8}
          autoComplete="new-password"
          className="flex-1 sm:min-w-40"
        />
        <Select name="role" defaultValue="user" className="sm:w-auto">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
        <Button type="submit" loading={pending}>
          {!pending && <PlusIcon width={16} height={16} />}
          {pending ? 'Creating…' : 'Create'}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {done && <p className="mt-2 text-sm text-success">Account created.</p>}

      <p className="mt-3 text-xs text-text-muted">
        Tell the person their password directly. There are no reset emails — if
        they forget it, set a new one here.
      </p>
    </div>
  );
}
