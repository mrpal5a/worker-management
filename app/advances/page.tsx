import Decimal from 'decimal.js';
import { listAdvances, listWorkers } from '@/lib/repo';
import { outstandingBalance } from '@/lib/advances';
import { toDecimal } from '@/lib/num';
import { money } from '@/lib/format';
import { AdvanceForm } from './advance-form';
import { AdvanceRow } from './advance-row';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { StatCard } from '@/components/ui/stat-card';
import { TableWrap, Th } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { WalletIcon, UsersIcon, CreditCardIcon, ClockIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function AdvancesPage() {
  const [advances, workers] = await Promise.all([listAdvances(), listWorkers()]);

  const summaries = advances.map((a) => {
    const principal = toDecimal(a.principal);
    const paid = a.advance_payments.reduce((sum, p) => sum.plus(toDecimal(p.amount)), new Decimal(0));
    const balance = outstandingBalance(principal, paid);
    return { advance: a, principal, paid, balance };
  });

  const totalOutstanding = summaries.reduce((a, s) => a.plus(s.balance), new Decimal(0));
  const totalDisbursed = summaries.reduce((a, s) => a.plus(s.principal), new Decimal(0));
  const totalRepaid = summaries.reduce((a, s) => a.plus(s.paid), new Decimal(0));
  const activeCount = summaries.filter((s) => !s.balance.isZero()).length;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Advances"
        subtitle="Interest-free advances taken by workers, repaid through monthly deductions."
        icon={<WalletIcon />}
        action={<HeroStat value={money(totalOutstanding)} label="outstanding" />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<UsersIcon width={16} height={16} />} label="Active advances" value={String(activeCount)} />
        <StatCard icon={<CreditCardIcon width={16} height={16} />} label="Total disbursed" value={money(totalDisbursed)} />
        <StatCard icon={<ClockIcon width={16} height={16} />} label="Total repaid" value={money(totalRepaid)} />
      </div>

      <AdvanceForm workers={workers.map((w) => ({ id: w.id, name: w.name }))} />

      {summaries.length === 0 ? (
        <EmptyState title="No advances yet" description="Add one above to start tracking it." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Worker</Th>
              <Th right>Taken</Th>
              <Th right>Paid</Th>
              <Th right>Balance</Th>
              <Th right>Monthly</Th>
              <Th right>Status</Th>
              <Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {summaries.map(({ advance }) => (
              <AdvanceRow
                key={advance.id}
                id={advance.id}
                workerName={advance.workers?.name ?? '(deleted worker)'}
                principal={advance.principal}
                monthlyDeduction={advance.monthly_deduction}
                note={advance.note}
                payments={advance.advance_payments.map((p) => ({
                  id: p.id,
                  paidOn: p.paid_on,
                  amount: p.amount,
                  note: p.note,
                }))}
              />
            ))}
          </tbody>
        </TableWrap>
      )}
    </main>
  );
}
