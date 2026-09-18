'use client';

import { useState, useTransition } from 'react';
import { toggleUser, changeRole, resetPassword } from '@/app/actions/users';
import type { Role } from '@/lib/session';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  /** True when this row is the signed-in admin's own account. */
  isSelf: boolean;
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
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
    <li
      className={`border-b border-border-base p-3 last:border-b-0 sm:p-4 ${pending ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-sm font-semibold text-text-base">
          {initials(name || email)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {name || email}
            {isSelf && <span className="ml-2 text-xs text-text-muted">(you)</span>}
          </div>
          <div className="truncate text-sm text-text-muted">{email}</div>
        </div>

        <Badge tone={role === 'admin' ? 'accent' : 'neutral'}>{role}</Badge>
        {!active && <Badge tone="danger">inactive</Badge>}
      </div>

      {/* An admin cannot act on their own row: doing so could lock everyone out. */}
      {!isSelf && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
          <Button
            variant="ghost"
            className="!min-h-0 px-2 py-1 text-xs"
            onClick={() => run(() => toggleUser(id, !active))}
            disabled={pending}
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </Button>
          <Button
            variant="ghost"
            className="!min-h-0 px-2 py-1 text-xs"
            onClick={() => run(() => changeRole(id, role === 'admin' ? 'user' : 'admin'))}
            disabled={pending}
          >
            Make {role === 'admin' ? 'user' : 'admin'}
          </Button>
          <Button
            variant="ghost"
            className="!min-h-0 px-2 py-1 text-xs"
            onClick={() => setResetting((v) => !v)}
          >
            Set password
          </Button>
        </div>
      )}

      {resetting && (
        <form
          action={(fd) => run(() => resetPassword(id, fd))}
          className="mt-2 flex flex-col gap-2 pl-12 sm:flex-row"
        >
          <Input
            name="password"
            type="password"
            placeholder="New password (min 8)"
            required
            minLength={8}
            autoComplete="new-password"
            className="flex-1"
          />
          <Button type="submit" loading={pending}>
            Save
          </Button>
        </form>
      )}

      {error && <p className="mt-2 pl-12 text-sm text-danger">{error}</p>}
    </li>
  );
}
