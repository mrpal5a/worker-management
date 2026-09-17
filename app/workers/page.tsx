import { listWorkers } from '@/lib/repo';
import { toggleWorker } from '@/app/actions/registers';
import { WorkerForm } from './worker-form';
import { toDecimal } from '@/lib/num';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function WorkersPage() {
  const workers = await listWorkers(true);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="mb-1 text-2xl font-semibold">Workers</h1>
      <p className="mb-6 text-sm text-text-muted">
        The day rate is what this worker is paid for one full day.
      </p>

      <WorkerForm />

      {workers.length === 0 ? (
        <p className="py-8 text-center text-text-muted">No workers yet. Add one above.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="tabular w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-border-base">
            <tr>
              <th className="py-2">Name</th>
              <th>Phone</th>
              <th className="text-right">Day rate</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id} className={`border-b border-border-base ${w.active ? '' : 'opacity-40'}`}>
                <td className="py-2">{w.name}</td>
                <td>{w.phone ?? '—'}</td>
                <td className="text-right">{money(toDecimal(w.pay_rate))}</td>
                <td className="text-right">
                  <form action={toggleWorker.bind(null, w.id, !w.active)}>
                    <button className="text-accent hover:underline">
                      {w.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </main>
  );
}
