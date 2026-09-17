'use client';

import { useState, useTransition } from 'react';
import { toggleUser, changeRole, resetPassword } from '@/app/actions/users';
import type { Role } from '@/lib/session';

interface Props {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  /** True when this row is the signed-in admin's own account. */
  isSelf: boolean;
}

export function UserRow({ id, email, name, role, active, isSelf }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ('error' in result) setError(result.error);
      else setResetting(false);
    });
  }

  return (
    <li className={`border-b border-border-base py-3 ${pending ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {name || email}
            {isSelf && <span className="ml-2 text-xs text-text-muted">(you)</span>}
          </div>
          <div className="truncate text-sm text-text-muted">{email}</div>
        </div>

        <span
          className={`rounded px-2 py-1 text-xs ${
            role === 'admin' ? 'bg-accent text-accent-fg' : 'bg-surface-sunken text-text-muted'
          }`}
        >
          {role}
        </span>

        {!active && (
          <span className="rounded bg-danger/15 px-2 py-1 text-xs text-danger">inactive</span>
        )}
      </div>

      {/* An admin cannot act on their own row: doing so could lock everyone out. */}
      {!isSelf && (
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => run(() => toggleUser(id, !active))}
            className="min-h-11 text-accent hover:underline"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            onClick={() => run(() => changeRole(id, role === 'admin' ? 'user' : 'admin'))}
            className="min-h-11 text-accent hover:underline"
          >
            Make {role === 'admin' ? 'user' : 'admin'}
          </button>
          <button
            onClick={() => setResetting((v) => !v)}
            className="min-h-11 text-accent hover:underline"
          >
            Set password
          </button>
        </div>
      )}

      {resetting && (
        <form
          action={(fd) => run(() => resetPassword(id, fd))}
          className="mt-2 flex flex-wrap gap-2"
        >
          <input
            name="password"
            type="password"
            placeholder="New password (min 8)"
            required
            minLength={8}
            autoComplete="new-password"
            className="flex-1 min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8"
          />
          <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover sm:min-h-9">Save</button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </li>
  );
}
