'use client';

import { useRef, useState, useTransition } from 'react';
import { addUser } from '@/app/actions/users';

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
    <div className="mb-8 rounded-lg border border-border-base bg-surface-raised p-4">
      <h2 className="mb-3 font-medium">Add an account</h2>
      <form ref={formRef} action={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="off"
          className="flex-1 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8 sm:min-w-48"
        />
        <input
          name="name"
          placeholder="Name"
          className="flex-1 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8 sm:min-w-32"
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8)"
          required
          minLength={8}
          autoComplete="new-password"
          className="flex-1 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8 sm:min-w-40"
        />
        <select name="role" defaultValue="user" className="min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-50 sm:min-h-9"
        >
          {pending ? '…' : 'Create'}
        </button>
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
