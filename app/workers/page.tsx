import { listWorkers } from '@/lib/repo';
import { WorkerForm } from './worker-form';
import { WorkerRow } from './worker-row';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { TableWrap, Th } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { UsersIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function WorkersPage() {
  const workers = await listWorkers(true);
  const activeCount = workers.filter((w) => w.active).length;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Workers"
        subtitle="The day rate is what this worker is paid for one full day."
        icon={<UsersIcon />}
        action={<HeroStat value={String(activeCount)} label="active" />}
      />

      <WorkerForm />

      {workers.length === 0 ? (
        <EmptyState title="No workers yet" description="Add one above to get started." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th right>Day rate</Th>
              <Th right>Status</Th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <WorkerRow
                key={w.id}
                id={w.id}
                name={w.name}
                phone={w.phone}
                payRate={w.pay_rate}
                active={w.active}
              />
            ))}
          </tbody>
        </TableWrap>
      )}
    </main>
  );
}
