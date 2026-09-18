'use client';

import { useState, useTransition } from 'react';
import { editCompany, toggleCompany } from '@/app/actions/registers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Td, Tr } from '@/components/ui/table';
import { toDecimal } from '@/lib/num';
import { money } from '@/lib/format';
import type { Numeric } from '@/lib/supabase';

interface Props {
  id: string;
  name: string;
  billRate: Numeric;
  active: boolean;
}

export function CompanyRow({ id, name, billRate, active }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await editCompany(id, formData);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-border-base bg-accent-soft/40">
        <td colSpan={3} className="py-2.5">
          <form action={onSave} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input name="name" defaultValue={name} required placeholder="Company name" className="flex-1 sm:min-w-36" />
            <Input
              name="billRate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={String(billRate)}
              required
              placeholder="Bill rate / day"
              className="sm:w-32"
            />
            <div className="flex gap-2">
              <Button type="submit" loading={pending}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
            {error && <span className="text-sm text-danger">{error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <Tr dim={!active}>
      <Td>{name}</Td>
      <Td right>{money(toDecimal(billRate))}</Td>
      <Td right>
        <div className="flex items-center justify-end gap-1.5">
          <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>
          <Button variant="ghost" className="!min-h-0 px-2 py-1 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="!min-h-0 px-2 py-1 text-xs"
            onClick={() => startTransition(() => toggleCompany(id, !active))}
            disabled={pending}
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </Td>
    </Tr>
  );
}
