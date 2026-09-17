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
    <li className={`border-b py-3 ${pending ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {name || email}
            {isSelf && <span className="ml-2 text-xs text-gray-500">(you)</span>}
          </div>
          <div className="truncate text-sm text-gray-500">{email}</div>
        </div>

        <span
          className={`rounded px-2 py-1 text-xs ${
            role === 'admin' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {role}
        </span>

        {!active && (
          <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">inactive</span>
        )}
      </div>

      {/* An admin cannot act on their own row: doing so could lock everyone out. */}
      {!isSelf && (
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => run(() => toggleUser(id, !active))}
            className="min-h-11 text-blue-600 underline"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            onClick={() => run(() => changeRole(id, role === 'admin' ? 'user' : 'admin'))}
            className="min-h-11 text-blue-600 underline"
          >
            Make {role === 'admin' ? 'user' : 'admin'}
          </button>
          <button
            onClick={() => setResetting((v) => !v)}
            className="min-h-11 text-blue-600 underline"
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
            className="min-h-11 flex-1 rounded border px-3 py-2"
          />
          <button className="min-h-11 rounded bg-black px-4 py-2 text-white">Save</button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}
