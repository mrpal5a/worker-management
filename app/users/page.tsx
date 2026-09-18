import { listProfiles } from '@/lib/users';
import { currentSession } from '@/lib/current-user';
import { UserForm } from './user-form';
import { UserRow } from './user-row';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { EmptyState } from '@/components/ui/empty-state';
import { ShieldIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [profiles, session] = await Promise.all([listProfiles(), currentSession()]);
  const activeCount = profiles.filter((p) => p.active).length;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Users"
        subtitle="Accounts can only be created here. Nobody can sign up on their own."
        icon={<ShieldIcon />}
        action={<HeroStat value={String(activeCount)} label="active accounts" />}
      />

      <UserForm />

      {profiles.length === 0 ? (
        <EmptyState title="No accounts yet" />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border-base">
          {profiles.map((p) => (
            <UserRow
              key={p.id}
              id={p.id}
              email={p.email}
              name={p.name}
              role={p.role}
              active={p.active}
              isSelf={session?.userId === p.id}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
