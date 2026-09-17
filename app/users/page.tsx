import { listProfiles } from '@/lib/users';
import { currentSession } from '@/lib/current-user';
import { UserForm } from './user-form';
import { UserRow } from './user-row';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [profiles, session] = await Promise.all([listProfiles(), currentSession()]);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-1 text-2xl font-semibold">Users</h1>
      <p className="mb-6 text-sm text-gray-500">
        Accounts can only be created here. Nobody can sign up on their own.
      </p>

      <UserForm />

      {profiles.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No accounts yet.</p>
      ) : (
        <ul className="border-t">
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
