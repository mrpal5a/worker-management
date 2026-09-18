import { listCompanies } from '@/lib/repo';
import { CompanyForm } from './company-form';
import { CompanyRow } from './company-row';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { TableWrap, Th } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { BriefcaseIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const companies = await listCompanies(true);
  const activeCount = companies.filter((c) => c.active).length;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Companies"
        subtitle="The bill rate is what this company is charged for one man-day."
        icon={<BriefcaseIcon />}
        action={<HeroStat value={String(activeCount)} label="active" />}
      />

      <CompanyForm />

      {companies.length === 0 ? (
        <EmptyState title="No companies yet" description="Add one above to get started." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Company</Th>
              <Th right>Bill rate</Th>
              <Th right>Status</Th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <CompanyRow key={c.id} id={c.id} name={c.name} billRate={c.bill_rate} active={c.active} />
            ))}
          </tbody>
        </TableWrap>
      )}
    </main>
  );
}
